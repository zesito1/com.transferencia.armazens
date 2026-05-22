sap.ui.define(["sap/ui/core/mvc/Controller","sap/ui/model/json/JSONModel", "sap/m/MessageToast",
  "sap/m/MessageBox","sap/m/SelectDialog", "sap/m/StandardListItem", "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator", "../model/ssccConfig"    
], function(Controller, JSONModel, MessageToast, MessageBox,
            SelectDialog, StandardListItem, Filter, FilterOperator,
            ssccConfig) {
  "use strict";

  return Controller.extend(
    "com.transferencia.armazens.controller.Main", {

    onInit: function() {
      this.getView().setModel(new JSONModel({
        plantaSelecionada:   "",
        depositoSelecionado: "",
        novoSSCC:            "",
        ssccs:               [],
        busy:                false
      }), "view");

      const oModel = this.getOwnerComponent().getModel();
      oModel.metadataLoaded().then(function() {
        this._carregarPlantas(oModel);
        this._carregarDepositos(oModel);
      }.bind(this)).catch(function() {
        MessageBox.error("Falha ao ligar ao servidor SAP.");
      });
    },

    _carregarPlantas: function(oModel) {
      const oSelect = this.byId("selectPlanta");
      oModel.read("/PlantSet", {
        success: function(oData) {
          oSelect.removeAllItems();
          oData.results.forEach(function(p) {
            oSelect.addItem(new sap.ui.core.Item({ key: p.Werks, text: p.Werks }));
          });
        },
        error: function() { MessageBox.error("Erro ao carregar plantas."); }
      });
    },

    _carregarDepositos: function(oModel) {
      const oSelect = this.byId("selectDeposito");
      oModel.read("/StorageLocationSet", {
        success: function(oData) {
          oSelect.removeAllItems();
          oData.results.forEach(function(s) {
            oSelect.addItem(new sap.ui.core.Item({ key: s.Lgort, text: s.Lgort }));
          });
        },
        error: function() { MessageBox.error("Erro ao carregar depósitos."); }
      });
    },

    onBrowseSSCC: function() {
      const oModel = this.getOwnerComponent().getModel();
      const oView  = this.getView();
      const that   = this;

      if (!this._oSSCCDialog) {
        this._oSSCCDialog = new SelectDialog({
          title: "SSCCs disponíveis",
          multiSelect: true,
          rememberSelections: false,
          confirm: function(oEvent) {
            const aContexts = oEvent.getParameter("selectedContexts");
            if (!aContexts || aContexts.length === 0) { return; }

            const oViewModel = oView.getModel("view");
            const aSsccs     = oViewModel.getProperty("/ssccs");
            let   iAdded     = 0;

            aContexts.forEach(function(oCtx) {
              const sExidv = oCtx.getObject().Exidv;
              if (!aSsccs.some(function(s) { return s.Exidv === sExidv; })) {
                aSsccs.push({ Exidv: sExidv });
                iAdded++;
              }
            });

            oViewModel.setProperty("/ssccs", aSsccs.slice());
            MessageToast.show(
              iAdded > 0 ? iAdded + " SSCC(s) adicionado(s)" : "SSCCs já estavam na lista"
            );
          },
          search: function(oEvent) {
            const sValue   = oEvent.getParameter("value").toLowerCase();
            const oBinding = oEvent.getParameter("itemsBinding");
            const oFilter  = new Filter("Exidv", function(sVal) {
              return sVal.toLowerCase().includes(sValue);
            });
            oBinding.filter(sValue ? [oFilter] : []);
          }
        });

        this._oSSCCDialog.setModel(new JSONModel({ items: [] }), "ssccBrowse");
        this._oSSCCDialog.bindAggregation("items", {
          path: "ssccBrowse>/items",
          template: new StandardListItem({
            title: "{ssccBrowse>Exidv}",
            icon: "sap-icon://shipping-status"
          })
        });

        oView.addDependent(this._oSSCCDialog);
      }

      // Limpa e abre
      this._oSSCCDialog.getModel("ssccBrowse").setProperty("/items", []);
      this._oSSCCDialog.open();

      const aFilters = ssccConfig.husDisponiveis.map(function(sHu) {
        return new Filter("Exidv", FilterOperator.EQ, sHu);
      });

      oModel.read("/SSCCSet", {
        filters: [ new Filter({ filters: aFilters, and: false }) ],
        success: function(oData) {
          console.log("SSCCSet recebido:", oData.results.length, "itens");
          if (oData.results.length === 0) {
            MessageToast.show("Nenhum SSCC disponível de momento.");
            return;
          }
          that._oSSCCDialog.getModel("ssccBrowse").setProperty("/items", oData.results);
        },
        error: function(oErr) {
          MessageBox.error("Erro ao carregar SSCCs do servidor.");
          console.error("SSCCSet erro:", oErr);
        }
      });
    },

    onPlantaChange: function(oEvent) {
      this.getView().getModel("view").setProperty(
        "/plantaSelecionada", oEvent.getParameter("selectedItem").getKey()
      );
    },

    onDepositoChange: function(oEvent) {
      this.getView().getModel("view").setProperty(
        "/depositoSelecionado", oEvent.getParameter("selectedItem").getKey()
      );
    },

    onAdicionarSSCC: function() {
      const oViewModel = this.getView().getModel("view");
      const sCodigo    = (oViewModel.getProperty("/novoSSCC") || "").trim();
      if (!sCodigo) { MessageToast.show("Introduza um código SSCC"); return; }
      const aSsccs = oViewModel.getProperty("/ssccs");
      if (aSsccs.some(function(s) { return s.Exidv === sCodigo; })) {
        MessageToast.show("SSCC já adicionado"); return;
      }
      aSsccs.push({ Exidv: sCodigo });
      oViewModel.setProperty("/ssccs", aSsccs.slice());
      oViewModel.setProperty("/novoSSCC", "");
      this.byId("ssccInput").focus();
      MessageToast.show("SSCC adicionado");
    },

    onDeleteSSCC: function(oEvent) {
      const oViewModel = this.getView().getModel("view");
      const oCtx   = oEvent.getParameter("listItem").getBindingContext("view");
      const aSsccs = oViewModel.getProperty("/ssccs");
      aSsccs.splice(parseInt(oCtx.getPath().split("/").pop(), 10), 1);
      oViewModel.setProperty("/ssccs", aSsccs.slice());
    },

    onSave: function() {
  const oViewModel = this.getView().getModel("view");
  const oModel     = this.getOwnerComponent().getModel();
  const sWerks     = oViewModel.getProperty("/plantaSelecionada");
  const sLgort     = oViewModel.getProperty("/depositoSelecionado");
  const aSsccs     = oViewModel.getProperty("/ssccs");
  const that       = this;

  if (!sWerks)        { MessageBox.warning("Selecione uma planta");         return; }
  if (!sLgort)        { MessageBox.warning("Selecione um depósito");        return; }
  if (!aSsccs.length) { MessageBox.warning("Adicione pelo menos um SSCC"); return; }

  oViewModel.setProperty("/busy", true);

  const aFiltros = aSsccs.map(function(s) {
    return new Filter("Exidv", FilterOperator.EQ, s.Exidv);
  });

  oModel.read("/SSCCSet", {
    filters: [ new Filter({ filters: aFiltros, and: false }) ],
    success: function(oData) {
      const aValidos    = oData.results.map(function(r) { return r.Exidv; });
      const aInvalidos  = aSsccs
        .map(function(s) { return s.Exidv; })
        .filter(function(sExidv) { return !aValidos.includes(sExidv); });

      if (aInvalidos.length > 0) {
        oViewModel.setProperty("/busy", false);
        MessageBox.error(
          "Os seguintes SSCCs não foram encontrados no sistema SAP:\n\n" +
          aInvalidos.map(function(s) { return "• " + s; }).join("\n") +
          "\n\nRemova-os da lista e tente novamente."
        );
        return;
      }

      oModel.create("/DocumentSet", {
        Werks: sWerks,
        Lgort: sLgort,
        DocumentToSSCC: {
          results: aSsccs.map(function(s) { return { Exidv: s.Exidv }; })
        }
      }, {
        success: function(oData) {
          console.log("Resposta completa do DocumentSet create:", JSON.stringify(oData));
          oViewModel.setProperty("/busy", false);
          const sDocNr = oData.DocNr || "";
          MessageBox.success(
            "Transferência gravada!" + (sDocNr ? "\nDocumento: " + sDocNr : ""),
            {
              onClose: function() {
                oViewModel.setProperty("/plantaSelecionada",   "");
                oViewModel.setProperty("/depositoSelecionado", "");
                oViewModel.setProperty("/ssccs", []);
                that.getOwnerComponent().getRouter().navTo("RouteTransferencia", {
                  docNr: sDocNr || "sem-documento"
                });
              }
            }
          );
        },
        error: function(oErr) {
          oViewModel.setProperty("/busy", false);
          let sMsg = "Erro ao gravar";
          try {
            const oError = JSON.parse(oErr.responseText);
            sMsg = oError.error.message.value;
            const aDetails = oError.error.innererror && oError.error.innererror.errordetails;
            if (aDetails && aDetails.length > 0) {
              sMsg += "\n\n" + aDetails.map(function(d) { return "• " + d.message; }).join("\n");
            }
          } catch (e) { console.error(e); }
          MessageBox.error(sMsg);
        }
      });
    },
    error: function() {
      oViewModel.setProperty("/busy", false);
      MessageBox.error("Não foi possível validar os SSCCs. Verifique a ligação ao servidor.");
    }
  });
}


  });
});