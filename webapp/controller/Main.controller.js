sap.ui.define(["sap/ui/core/mvc/Controller","sap/ui/model/json/JSONModel", "sap/m/MessageToast",
  "sap/m/MessageBox", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "../model/ssccConfig",
  "sap/m/Dialog", "sap/m/Button", "sap/m/VBox", "sap/m/Text", "sap/m/Title", "sap/ui/core/Icon"
], function(Controller, JSONModel, MessageToast, MessageBox,
            Filter, FilterOperator,
            ssccConfig,
            Dialog, Button, VBox, Text, Title, Icon) {
  "use strict";

  return Controller.extend(
    "com.cc.tranferencia.armazens.controller.Main", {

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

    onAdicionarSSCC: function() {
      const oViewModel = this.getView().getModel("view");
      const sCodigo    = (oViewModel.getProperty("/novoSSCC") || "").trim();
      if (!sCodigo) { MessageToast.show("Introduza um código SSCC"); return; }

      const aSsccs = oViewModel.getProperty("/ssccs");
      if (aSsccs.some(function(s) { return s.Exidv === sCodigo; })) {
        MessageToast.show("SSCC já adicionado");
        return;
      }

      aSsccs.push({
        Exidv:       sCodigo,
        Vemng:       "",
        Vemeh:       "",
        Charg:       "",
        Matnr:       "",
        Maktx:       "",
        StatusText:  "A validar",
        StatusState: "Warning"
      });
      oViewModel.setProperty("/ssccs", aSsccs.slice());
      oViewModel.setProperty("/novoSSCC", "");
      this._updateCounter();
      this.byId("ssccInput").focus();
      this._validateSSCC(sCodigo);
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


    _validateSSCC: function(sExidv) {
      const oViewModel = this.getView().getModel("view");

      // ── VALIDAÇÃO LOCAL (temporária) ─────────────────────────────────────────
      // Ativar caso o SSCCSet não tenha dados no cliente SAP.
      // Para usar: comentar o bloco "VALIDAÇÃO REAL" abaixo e descomentar este.
      /*
      const aSsccsLocal = oViewModel.getProperty("/ssccs");
      const iIdxLocal   = aSsccsLocal.findIndex(function(s) { return s.Exidv === sExidv; });
      if (iIdxLocal === -1) { return; }
      const oLocal = ssccConfig.husData.find(function(h) { return h.Exidv === sExidv; });
      if (oLocal) {
        aSsccsLocal[iIdxLocal] = {
          Exidv: sExidv, Vemng: oLocal.Vemng || "", Vemeh: oLocal.Vemeh || "",
          Charg: oLocal.Charg || "", Matnr: oLocal.Matnr || "", Maktx: oLocal.Maktx || "",
          StatusText: "Válido", StatusState: "Success"
        };
      } else {
        aSsccsLocal[iIdxLocal] = Object.assign({}, aSsccsLocal[iIdxLocal], {
          StatusText: "SSCC não encontrado", StatusState: "Error"
        });
      }
      oViewModel.setProperty("/ssccs", aSsccsLocal.slice());
      */
      // ── FIM VALIDAÇÃO LOCAL ───────────────────────────────────────────────────

      // ── VALIDAÇÃO REAL (SAP backend via $filter) ─────────────────────────────
      // Usa $filter em vez de chave direta para evitar validação ZHU/011.
      const oModel = this.getOwnerComponent().getModel();
      oModel.read("/SSCCSet", {
        filters: [new Filter("Exidv", FilterOperator.EQ, sExidv)],
        success: function(oData) {
          const aSsccs = oViewModel.getProperty("/ssccs");
          const iIdx   = aSsccs.findIndex(function(s) { return s.Exidv === sExidv; });
          if (iIdx === -1) { return; }

          if (oData.results && oData.results.length > 0) {
            const oBackend = oData.results[0];
            const oLocal   = ssccConfig.husData.find(function(h) { return h.Exidv === sExidv; }) || {};
            aSsccs[iIdx] = {
              Exidv:       sExidv,
              Vemng:       oBackend.Vemng || oLocal.Vemng || "",
              Vemeh:       oBackend.Vemeh || oLocal.Vemeh || "",
              Charg:       oBackend.Charg || oLocal.Charg || "",
              Matnr:       oBackend.Matnr || oLocal.Matnr || "",
              Maktx:       oBackend.Maktx || oLocal.Maktx || "",
              StatusText:  "Válido",
              StatusState: "Success"
            };
          } else {
            aSsccs[iIdx] = Object.assign({}, aSsccs[iIdx], {
              StatusText:  "SSCC não encontrado",
              StatusState: "Error"
            });
          }
          oViewModel.setProperty("/ssccs", aSsccs.slice());
        },
        error: function(oErr) {
          const aSsccs = oViewModel.getProperty("/ssccs");
          const iIdx   = aSsccs.findIndex(function(s) { return s.Exidv === sExidv; });
          if (iIdx === -1) { return; }
          let sMsg = "Erro ao validar SSCC";
          try {
            const oError = JSON.parse(oErr.responseText);
            sMsg = oError.error.message.value || sMsg;
          } catch (e) {}
          aSsccs[iIdx] = Object.assign({}, aSsccs[iIdx], {
            StatusText:  sMsg,
            StatusState: "Error"
          });
          oViewModel.setProperty("/ssccs", aSsccs.slice());
        }
      });
      // ── FIM VALIDAÇÃO REAL ────────────────────────────────────────────────────
    },

    _updateCounter: function() {
      const oViewModel = this.getView().getModel("view");
      const aSsccs     = oViewModel.getProperty("/ssccs");
      const oCounter   = this.byId("ssccCounter");
      if (oCounter) {
        oCounter.setText(aSsccs.length + (aSsccs.length === 1 ? " item" : " itens"));
      }
    },

    onDeleteSSCC: function(oEvent) {
      const oViewModel = this.getView().getModel("view");
      const oCtx   = oEvent.getParameter("listItem").getBindingContext("view");
      const aSsccs = oViewModel.getProperty("/ssccs");
      aSsccs.splice(parseInt(oCtx.getPath().split("/").pop(), 10), 1);
      oViewModel.setProperty("/ssccs", aSsccs.slice());
      this._updateCounter();
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

      const aPendentes = aSsccs.filter(function(s) { return s.StatusState === "Warning"; });
      if (aPendentes.length > 0) {
        MessageBox.warning(
          aPendentes.length + " SSCC(s) ainda em validação. Aguarde ou remova-os antes de transferir."
        );
        return;
      }

      const aValidos  = aSsccs.filter(function(s) { return s.StatusState === "Success"; });
      const aErros    = aSsccs.filter(function(s) { return s.StatusState === "Error"; });

      if (!aValidos.length) {
        MessageBox.warning("Não existem SSCCs válidos para transferir.");
        return;
      }

      if (aErros.length > 0) {
        MessageBox.confirm(
          aErros.length + " SSCC(s) com erro serão ignorados.\n" +
          "Pretende transferir apenas os " + aValidos.length + " SSCC(s) válido(s)?",
          {
            title: "SSCCs com erro",
            onClose: function(sAction) {
              if (sAction === MessageBox.Action.OK) {
                that._executarTransferencia(oModel, sWerks, sLgort, aValidos, oViewModel);
              }
            }
          }
        );
        return;
      }

      MessageBox.confirm(
        "Vai transferir " + aValidos.length + " SSCC(s) para o depósito " + sLgort + ".\nConfirma?",
        {
          title:   "Confirmar Transferência",
          onClose: function(sAction) {
            if (sAction !== MessageBox.Action.OK) { return; }
            that._executarTransferencia(oModel, sWerks, sLgort, aValidos, oViewModel);
          }
        }
      );
    },

    _executarTransferencia: function(oModel, sWerks, sLgort, aValidos, oViewModel) {
      const that = this;
      oViewModel.setProperty("/busy", true);

      oModel.create("/TransferSet", {
        Werks: sWerks,
        Lgort: sLgort,
        TransferToSSCC: {
          results: aValidos.map(function(s) { return { Exidv: s.Exidv }; })
        }
      }, {
        success: function(oData) {
          oViewModel.setProperty("/busy", false);
          that._showSuccessDialog(oData.DocNr || "", oViewModel);
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

    _showSuccessDialog: function(sDocNr, oViewModel) {
      const oContent = new VBox({
        alignItems: "Center",
        items: [
          new Icon({
            src:   "sap-icon://accept",
            size:  "3rem",
            color: "Positive",
            class: "sapUiSmallMarginBottom"
          }),
          new Title({
            text:  "Transferência Concluída",
            level: "H3",
            class: "sapUiSmallMarginBottom"
          }),
          new Text({
            text:    "A transferência foi gravada com sucesso no sistema SAP.",
            wrapping: true,
            textAlign: "Center",
            class: "sapUiSmallMarginBottom"
          })
        ]
      });

      if (sDocNr) {
        oContent.addItem(new Text({
          text:  "Documento: " + sDocNr,
          class: "sapUiSmallMarginTop"
        }));
      }

      const that    = this;
      const oDialog = new Dialog({
        title:          "Transferência Concluída",
        type:           "Message",
        state:          "Success",
        content:        oContent,
        beginButton:    new Button({
          text:  "Fechar",
          type:  "Emphasized",
          press: function() {
            oDialog.close();
          }
        }),
        afterClose: function() {
          oDialog.destroy();
          oViewModel.setProperty("/plantaSelecionada",   "");
          oViewModel.setProperty("/depositoSelecionado", "");
          oViewModel.setProperty("/ssccs", []);
          that._updateCounter();
        }
      });

      this.getView().addDependent(oDialog);
      oDialog.open();
    }

  });
});
