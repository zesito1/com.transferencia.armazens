sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/Device",
  "./model/models"
], function(UIComponent, Device, models) {
  "use strict";

  return UIComponent.extend("com.cc.transferencia.armazens.Component", {

    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },

    init: function() {
      UIComponent.prototype.init.call(this);

      this.setModel(models.createDeviceModel(), "device");

      this.getRouter().initialize();
    },

    getContentDensityClass: function() {
      if (this.contentDensityClass === undefined) {
        if (document.body.classList.contains("sapUiSizeCozy") ||
            document.body.classList.contains("sapUiSizeCompact")) {
          this.contentDensityClass = "";
        } else if (!Device.support.touch) {
          this.contentDensityClass = "sapUiSizeCompact";
        } else {
          this.contentDensityClass = "sapUiSizeCozy";
        }
      }
      return this.contentDensityClass;
    }
  });
});