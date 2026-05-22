sap.ui.define(["./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast"], function(BaseController, JSONModel, MessageToast) {
  "use strict";

  return BaseController.extend(
    "com.transferencia.armazens.controller.Transferencia", {

    onInit: function() {
      this.getView().setModel(new JSONModel({
        documento: ""
      }), "transferView");

      this.getOwnerComponent().getRouter()
        .getRoute("RouteTransferencia")
        .attachMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function(oEvent) {
      const sDocNr = oEvent.getParameter("arguments").docNr || "";
      this.getView().getModel("transferView").setProperty("/documento", sDocNr);
    },

    onSair: function() {
      MessageToast.show("Processo finalizado");
      this.getOwnerComponent().getRouter().navTo("main");
    }
  });
});