PME.Translate.Base.prototype["_translateTranslatorLoadedOld"] = PME.Translate.Base.prototype._translateTranslatorLoaded;
PME.Translate.Base.prototype["completeOld"] = PME.Translate.Base.prototype.complete;
PME.Translate.Sandbox.Base["_itemDoneOld"] = PME.Translate.Sandbox.Base._itemDone;

PME.Translate.Base.prototype["_translateTranslatorLoaded"] = function () {
	try {
		var _this = this,
			xmlhttp = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
		xmlhttp.mozBackgroundRequest = true;
		xmlhttp.open('GET', "chrome://pme/content/pme_ui.js", true);
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				PME.debug(xmlhttp.responseText)
				_this._sandboxManager.eval(xmlhttp.responseText, ["entry", "selection", "single"], (_this._currentTranslator.file ? _this._currentTranslator.file.path : _this._currentTranslator.label));
				PME.debug(_this._sandboxManager.sandbox["entry"].apply(null, _this._getParameters()));
				_this._translateTranslatorLoadedOld();
				_this.setHandler("error", function () {
					var params = _this._getParameters();
					params.push({});
					params.push(true)
					PME.debug(_this._sandboxManager.sandbox["single"].apply(null, params));
				});
			}
		};
		xmlhttp.send(null);
	}
	catch(e) {
		PME.debug("Error _translateTranslatorLoaded: " + e.message);
	}
}

PME.Translate.Base.prototype["complete"] = function (returnValue, error) {
	try {
		var state = this._currentState;
		this.completeOld(returnValue, error);
		this._currentState = state;
	}
	catch(e) {
		PME.debug("Error complete: " + e.message);
	}
}

PME.Translate.Sandbox.Base["_itemDone"] = function (translate, item) {
	this._itemDoneOld(translate, item);
	translate.saveQueue = [];
	translate._saveItems([item]);
}

PME.Translate.Base.prototype["_saveItems"] = function (items) {
	var _this = this;

	function transferObject(obj) {
		return PME.isFx ? _this._sandboxManager.sandbox.JSON.wrappedJSObject.parse(JSON.stringify(obj)) : obj;
	}

	PME.debug("~~~~translate._saveItems method overide");
	try {
		if(Object.prototype.toString.call(items) === "[object Array]")
			items = items[0];
		var params = this._getParameters().concat([transferObject(items), this.translator[0].translatorID == "8cb314cf-2628-40cd-9713-4e773b8ed5d4"]);
		PME.debug(this._sandboxManager.sandbox["single"].apply(null, params));
	}
	catch(e) {
		PME.debug("Error _saveItems: " + e.message);
	}
}

PME.Translate.Sandbox.Web.selectItems = function (translate, items, callback) {
	function transferObject(obj) {
		return PME.isFx ? translate._sandboxManager.sandbox.JSON.wrappedJSObject.parse(JSON.stringify(obj)) : obj;
	}

	if(PME.Utilities.isEmpty(items))
		throw new Error("Translator called select items with no items");

	if(Object.prototype.toString.call(items) === "[object Array]") {
		translate._debug("WARNING: PME.selectItems should be called with an object, not an array");
		var itemsObj = {};
		for(var i in items) itemsObj[i] = items[i];
		items = transferObject(itemsObj);
	}
	translate._aborted = true;
	var params = translate._getParameters().concat([items, function(selectedItems) {
		callback(transferObject(selectedItems));
	}]);
	PME.debug(translate._sandboxManager.sandbox["selection"].apply(null, params));
	//some translators will not have a callback.
	//these will fail
}

PME.Translate.Sandbox.Web._itemDone = function (translate, item) {
	translate._aborted = false;
	PME.Translate.Sandbox.Base._itemDone(translate, item);
}

PME.Translate.Web.prototype.Sandbox = PME.Translate.Sandbox._inheritFromBase(PME.Translate.Sandbox.Web);
