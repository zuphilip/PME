(function() {
"use strict";
// PME.js

window.PME = {};

var Registry = (function() {
	var tr = {
		// -- import
		"RIS": {
			g: "32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"
		},
		"BibTeX": {
			g: "9cb70025-a888-4a29-a210-93ec52da40d4"
		},

		// -- web
		"Financial Times": {
			m: "^https?://(www|search)\\.ft\\.com",
			g: "fc9b7700-b3cc-4150-ba89-c7e4443bd96d"
		},
		"wsj": {
			m: "^http://(online|blogs)?\\.wsj\\.com/",
			g: "53f8d182-4edc-4eab-b5a1-141698a1303b"
		},
		"PubMed Central": {
			m: "https?://[^/]*.nih.gov/",
			g: "27ee5b2c-2a5a-4afc-a0aa-d386642d4eed"
		},
		"ScienceDirect": {
			m: "^https?://[^/]*science-?direct\\.com[^/]*/science(\\/article)?(\\?(?:.+\\&|)ob=(?:ArticleURL|ArticleListURL|PublicationURL))?",
			g: "b6d0a7a-d076-48ae-b2f0-b6de28b194e"
		},
		"ProQuest": {
			m: "^https?://search\\.proquest\\.com.*\\/(docview|pagepdf|results|publicationissue|browseterms|browsetitles|browseresults|myresearch\\/(figtables|documents))",
			g: "fce388a6-a847-4777-87fb-6595e710b7e7"
		},
		"Google Scholar": {
			m: "^https?://scholar\\.google\\.(?:com|cat|(?:com?\\.)?[a-z]{2})/scholar(?:_case)?\\?",
			g: "57a00950-f0d1-4b41-b6ba-44ff0fc30289"
		},
		"Scopus": {
			m: "^http://www\\.scopus\\.com[^/]*",
			g: "a14ac3eb-64a0-4179-970c-92ecc2fec992"
		},
		"Ovid": {
			m: "(gw2|asinghal|sp)[^\\/]+/ovidweb\\.cgi",
			g: "cde4428-5434-437f-9cd9-2281d14dbf9"
		},
		"HighWire": {
			m: "^http://[^/]+/(?:cgi/searchresults|cgi/search|cgi/content/(?:abstract|full|short|summary)|current.dtl$|content/vol[0-9]+/issue[0-9]+/(?:index.dtl)?$)",
			g: "5eacdb93-20b9-4c46-a89b-523f62935ae4"
		},
		"HighWire 2.0": {
			m: "^[^\\?]+(content/([0-9]+[A-Z\\-]*/[0-9]+|current|firstcite|early)|search\\?submit=|search\\?fulltext=|cgi/collection/.+)",
			g: "8c1f42d5-02fa-437b-b2b2-73afc768eb07"
		},
		"Wiley Online Library": {
			m: "^https?://onlinelibrary\\.wiley\\.com[^\\/]*/(?:book|doi|advanced/search|search-web/cochrane)",
			g: "fe728bc9-595a-4f03-98fc-766f1d8d0936"
		},
		"OCLC WorldCat FirstSearch": {
			m: "https?://[^/]*firstsearch\\.oclc\\.org[^/]*/WebZ/",
			g: "838d8849-4ffb-9f44-3d0d-aa8a0a079afe"
		},
		"Open WorldCat": {
			m: "^https?://(.+).worldcat\\.org/",
			g: "c73a4a8c-3ef1-4ec8-8229-7531ee384cc4"
		},
		"EBSCOHost": {
			m: "^https?://[^/]+/(?:eds|bsi|ehost)/(?:results|detail|folder)",
			g: "d0b1914a-11f1-4dd7-8557-b32fe8a3dd47"
		},
		"GaleGDC": {
			m: "/gdc/ncco/",
			g: "04e63564-b92b-41cd-a9d5-366a02056d10"
		}, 
		"Galegroup": {
			m: "https?://(find|go)\\.galegroup\\.com",
			g: "4ea89035-3dc4-4ae3-b22d-726bc0d83a64"
		},
		"IEEE Xplore": {
			m: "^https?://[^/]*ieeexplore\\.ieee\\.org[^/]*/(?:[^\\?]+\\?(?:|.*&)arnumber=[0-9]+|search/(?:searchresult.jsp|selected.jsp)|xpl\\/(mostRecentIssue|tocresult).jsp\\?)",
			g: "92d4ed84-8d0-4d3c-941f-d4b9124cfbb"
		}
	},
	g2t, m2t;

	function init() {
		g2t = {}; m2t = {};
		each(tr, function(ts, name) {
			if (ts.g) {
				ts.g = ts.g.toLowerCase();
				g2t[ts.g] = name;
			}
			if (ts.m)
				m2t[ts.m] = ts.g;
		});
	}

	function findByID(classID) {
		if (! g2t) init();
		return g2t[classID.toLowerCase()];
	}

	function matchURL(url) {
		if (! m2t) init();

		for (var re in m2t) {
			if (new RegExp(re).test(url)) {
				return m2t[re];
			}
		}

		return null;
	}
	
	return {
		findByID: findByID,
		matchURL: matchURL
	};
}());


var pageURL, pageDoc,
	pmeCallback,
	pmeOK = true,	// when this is false, things have gone pear-shaped and no new actions should be started
	pmeCompleted = false,
	pmeWaitForExplicitDone = false,
	pmeTaskCount = 0;


// ------------------------------------------------------------------------
//  _                   _             
// | | ___   __ _  __ _(_)_ __   __ _ 
// | |/ _ \ / _` |/ _` | | '_ \ / _` |
// | | (_) | (_| | (_| | | | | | (_| |
// |_|\___/ \__, |\__, |_|_| |_|\__, |
//          |___/ |___/         |___/ 
// ------------------------------------------------------------------------
function log() {
	var stuff = Array.prototype.slice.call(arguments, 0);
	stuff.unshift("PME");
	if(window.console && console.info) {
		if (console.info.apply)
			console.info.apply(console, stuff);
		else // IE...
			console.info(stuff.join(" "));
	}
}

function warn() {
	var stuff = Array.prototype.slice.call(arguments, 0);
	stuff.unshift("_Warning_");
	log.apply(null, stuff);
}

function fatal() {
	if (! pmeOK) return;

	var stuff = Array.prototype.slice.call(arguments, 0);
	stuff.unshift("** FATAL **");
	log.apply(null, stuff);

	pmeOK = false;
	completed(null);
}

PME.debug = function(str) {
	log("[trans]", str);
};



// ------------------------------------------------------------------------
//                                                    _   _ _     
//   ___ ___  _ __ ___  _ __ ___   ___  _ __    _   _| |_(_) |___ 
//  / __/ _ \| '_ ` _ \| '_ ` _ \ / _ \| '_ \  | | | | __| | / __|
// | (_| (_) | | | | | | | | | | | (_) | | | | | |_| | |_| | \__ \
//  \___\___/|_| |_| |_|_| |_| |_|\___/|_| |_|  \__,_|\__|_|_|___/
//                                                                
// ------------------------------------------------------------------------
function each(vals, handler) {
	var arr = "length" in vals,
		out = arr ? [] : {};

	if (arr) {
		for (var ix = 0; ix < vals.length; ++ix) {
			if (! ix in vals)
				continue;
			handler(vals[ix], ix, vals);
		}
	}
	else {
		for (var key in vals)
			handler(vals[key], key, vals);
	}

	return out;
}

function map(vals, pred) {
	var arr = "length" in vals,
		out = arr ? [] : {};

	if (arr) {
		for (var ix = 0; ix < vals.length; ++ix) {
			if (! ix in vals)
				continue;
			var val = vals[ix],
				subst = pred(val, ix, vals);
			if (undefined !== subst)
				out.push(subst);
		}
	}
	else {
		for (var key in vals) {
			var val = vals[key],
				subst = pred(val, key, vals);
			if (undefined !== subst)
				out[key] = subst;
		}
	}

	return out;
}

function filter(vals, pred) {
	var arr = "length" in vals,
		out = arr ? [] : {};

	if (arr) {
		for (var ix = 0; ix < vals.length; ++ix) {
			if (! ix in vals)
				continue;
			var val = vals[ix];
			if (true === pred(val, ix, vals))
				out.push(val);
		}
	}
	else {
		for (var key in vals) {
			var val = vals[key];
			if (true === pred(val, key, vals))
				out[key] = val;
		}
	}
	return out;
}

function flatten(vals) {
	if (! ("length" in vals))
		return vals;

	var out = [];
	for (var ix = 0; ix < vals.length; ++ix) {
		var v = vals[ix];
		if(v instanceof Array)
			out = out.concat(flatten(v));
		else
			out.push(v);
	}
	return out;
}

function purge(vals) {
	return filter(vals, function(val, key) {
		return (val !== null) && (val !== undefined);
	});
}

function makeArray(x) {
	if (x == null)
		return [];

	return ("length" in x) ? x : [x];
}

function waitFor(pred, maxTime, callback) {
	var interval = 20;
	if (pred())
		callback(true);
	else {
		if (maxTime - interval > 0)
			setTimeout(function() { waitFor(pred, maxTime - interval, callback); }, interval);
		else
			callback(false);
	}
}


// ------------------------------------------------------------------------
//  _ _  __      _   _                
// | (_)/ _| ___| |_(_)_ __ ___   ___ 
// | | | |_ / _ \ __| | '_ ` _ \ / _ \
// | | |  _|  __/ |_| | | | | | |  __/
// |_|_|_|  \___|\__|_|_| |_| |_|\___|
//                                    
// ------------------------------------------------------------------------
function vanish() {
	try {
		PME.Translator.clearAll();
		PME.TranslatorClass.unloadAll();
		if (window.PME_SCR)
			PME_SCR.parentNode.removeChild(PME_SCR);
	} catch(e) {}

	pmeOK = false;
	pageURL = pageDoc = pmeCallback = undefined;

	window.PME = undefined;
	window.FW = undefined;

	window.PME_SCR = undefined;
	window.PME_SRV = undefined;
}

function completed(data) {
	if (pmeCompleted)
		return;
	pmeCompleted = true;

	if (pmeOK)
		log("completed, data = ", data);

	pmeCallback && pmeCallback(data);

	setTimeout(vanish, 1);
}

function taskStarted() {
	++pmeTaskCount;
	log("taskStarted: ", pmeTaskCount);
}

function taskEnded() {
	--pmeTaskCount;
	log("taskEnded: ", pmeTaskCount);

	if ((! pmeTaskCount) && (! pmeWaitForExplicitDone))
		setTimeout(function() { PME.done(); }, 1);
}

PME.wait = function() {
	pmeWaitForExplicitDone = true;
};

PME.done = function() {
	log("done(), item count: " + PME.items.length);
	completed(PME.items.length ? { items: PME.items } : null);
};




// ------------------------------------------------------------------------
//  _ _                     
// (_) |_ ___ _ __ ___  ___ 
// | | __/ _ \ '_ ` _ \/ __|
// | | ||  __/ | | | | \__ \
// |_|\__\___|_| |_| |_|___/
//                          
// ------------------------------------------------------------------------
PME.items = [];

PME.selectItems = function(items, callback) {
	var out = {};
	for (var k in items) {
		out[k] = items[k];
		break;		// always just pick the first one for now
	}


	// selectItems can be called async or sync, depending on existence of callback param
	if (callback) {
		taskStarted();

		setTimeout(function() {
			callback(out);
			taskEnded();
		}, 1);
	}
	else
		return out;
};


PME.Item = function(type) {
	log("creating item of type " + type);
	this.itemType = type;
	this.creators = [];
	this.attachments = [];

	this.complete = function() {
		log("item completed", this);
		PME.items.push(this);
		delete this.complete;
	};
};


// ------------------------------------------------------------------------
//  _____                    _       _              ____ _               
// |_   _| __ __ _ _ __  ___| | __ _| |_ ___  _ __ / ___| | __ _ ___ ___ 
//   | || '__/ _` | '_ \/ __| |/ _` | __/ _ \| '__| |   | |/ _` / __/ __|
//   | || | | (_| | | | \__ \ | (_| | || (_) | |  | |___| | (_| \__ \__ \
//   |_||_|  \__,_|_| |_|___/_|\__,_|\__\___/|_|   \____|_|\__,_|___/___/
//                                                                       
// ------------------------------------------------------------------------
PME.TranslatorClass = function(classID) {
	if (! pmeOK)
		return null;

	var intf = {
		name: null,
		id: null,
		api: null,
		spec: null,
		script: null
	};

	if (PME.TranslatorClass.cache[classID])
		return PME.TranslatorClass.cache[classID];
	PME.TranslatorClass.cache[classID] = intf;
	intf.id = classID;

	// -- find and load script
	intf.name = Registry.findByID(classID);
	if (intf.name) {
		log("loading translator class " + intf.name);

		intf.script = document.createElement("script");
		intf.script.src = PME.TranslatorClass.baseURL + intf.name + ".js";
		intf.script.onerror = function() {
			fatal("translator class failed to load: ", intf.name);
		}
		document.getElementsByTagName("head")[0].appendChild(intf.script);
	}
	else {
		fatal("no translator class in registry with ID", classID);
		return null;
	}

	intf.unload = function() {
		if (intf.script)
			intf.script.parentNode.removeChild(intf.script);
		intf = {};
	};

	return intf;
};

PME.TranslatorClass.loaded = function(spec, api) {
	// this function is called at the end of each translator script file
	log("translator class loaded ", spec.label);

	var trClass = PME.TranslatorClass.cache[spec.translatorID];
	if (! trClass) {
		fatal("got a load event for ", spec, "which was not found in the cache.");
		return;
	}
	trClass.spec = spec;
	trClass.api = api;
};

PME.TranslatorClass.unloadAll = function() {
	each(PME.TranslatorClass.cache, function(t) {
		t.unload();
	});
	PME.TranslatorClass.cache = {};
};


PME.TranslatorClass.cache = {};
PME.TranslatorClass.baseURL = "http://" + PME_SRV + "/extractors/"; // PME_SRV is set by the bookmarklet


// ------------------------------------------------------------------------
//  _____                    _       _             
// |_   _| __ __ _ _ __  ___| | __ _| |_ ___  _ __ 
//   | || '__/ _` | '_ \/ __| |/ _` | __/ _ \| '__|
//   | || | | (_| | | | \__ \ | (_| | || (_) | |   
//   |_||_|  \__,_|_| |_|___/_|\__,_|\__\___/|_|   
//                                                 
// ------------------------------------------------------------------------
PME.Translator = function(type) {
	var handlers = {},
		text = "",
		textIndex = 0,

		trClass = null,

		doc = pageDoc,
		url = pageURL,
		intf;

	function setTranslator(classID) {
		if (trClass)
			fatal("tried to modify an inited translator.");
		trClass = PME.TranslatorClass(classID);
	}

	function getTranslatorObject(cont) {
		if (! (trClass && trClass.api)) {
			fatal("getTranslatorObject called on uninited or unloaded translator");
			return;
		}

		cont(trClass.api);
	}

	function setDocument(newDoc) {
		doc = newDoc;
	}

	function setString(newText) {
		text = newText;
		textIndex = 0;
	}

	function read(size) {
		if (! text.length)
			return false;

		var shouldTrim = false;

		if (size === undefined) {
			var nlre = /(\n|\r\n|\r)/g,
				nli = nlre.test(text.substr(textIndex));

			if (! nli)
				size = text.length - textIndex;
			else {
				size = nlre.lastIndex;
				shouldTrim = true;
			}
		}
		else
			size -= textIndex;

		if (size <= 0)
			return false;

		var sub = text.substr(textIndex, size);
		textIndex += size;
		if (shouldTrim)
			sub = sub.replace(/(\n|\r\n|\r)$/, "");

		return sub;
	}

	function setSearch(opt) {
		// not supported
	}

	function setHandler(event, handler) {
		if (! handlers[event])
			handlers[event] = [];
		handlers[event].push(handler);
	}

	function notifyHandlers(event /*, param1, .., paramN */) {
		var ha = handlers[event];
		if (! ha) return;
		var args = Array.prototype.slice.call(arguments, 1);
		each(ha, function(h) { h.apply(null, args); });
	}

	function waitForTranslatorClass(cont) {
		if (trClass && trClass.api) {
			cont();
			return;
		}

		waitFor(
			function() { return !!trClass.api; },
			5000,
			function(success) {
				if (! success)
					fatal("timeout while waiting for translator class", trClass.name, "(" + trClass.id + ")");
				else
	 				cont();
			}
		);
	}

	function translate() {
		if (! pmeOK) return;
		if (! trClass) {
			fatal("translate() called on uninited Translator");
			return;
		}

		taskStarted();

		waitForTranslatorClass(function() {
			try {
				log('run translator', trClass.name, 'with url', url, 'and doc', doc);
				if (type == "import")
					trClass.api.doImport();
				else if (type == "web")
					trClass.api.doWeb(doc, url);
				else
					fatal("can't handle translators of type", type);
			}
			catch(e) {
				fatal("error during translation", e, e.message);
				return;
			}

			taskEnded();
		});
	}

	return intf = {
		setTranslator: setTranslator,
		getTranslatorObject: getTranslatorObject,

		setDocument: setDocument,
		setString: setString,
		setSearch: setSearch,
		setHandler: setHandler,
		translate: translate,

		read: read
	}
};

PME.Translator.stack = [];
PME.Translator.clearAll = function() {
	PME.Translator.stack = [];
};

PME.loadTranslator = function(type) {
	var tr = PME.Translator(type);
	PME.Translator.stack.unshift(tr);
	return tr;
};

// -- import translators use PME.read() to read from data set by trans.setString()
PME.read = function(size) {
	var data = false,
		trIx = 0,
		tr;

	do {
		tr = PME.Translator.stack[trIx++];
		if (tr)
			data = tr.read(size);
	} while ((! data) && tr);

	return data;
};


// ------------------------------------------------------------------------
//  _   _ _   _ _ 
// | | | | |_(_) |
// | | | | __| | |
// | |_| | |_| | |
//  \___/ \__|_|_|
//                
// ------------------------------------------------------------------------
PME.Util = {};

PME.Util.trim = function(str) {
	return str.replace(/^\s+|\s+$/g, '')
};

PME.Util.trimInternal = function(str) {
	return str.replace(/\s+/g, ' ');
};

PME.Util.capitalizeTitle = function(str) {
	return str; // TBI
};

PME.Util.cleanAuthor = function(str) {
	return str; // TBI
};

PME.Util.superCleanString = function(str) {
	str = str.replace(/^[\x00-\x27\x29-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F\s]+/, "");
	return str.replace(/[\x00-\x28\x2A-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F\s]+$/, "");
};

PME.Util.locale = function() {
	var l_lang;
	if (navigator.userLanguage) // Explorer
	  l_lang = navigator.userLanguage;
	else if (navigator.language) // FF
	  l_lang = navigator.language;
	else
	  l_lang = "en_US";
	
	return l_lang.split("-");
}; 

PME.Util.getLocaleDateOrder = function() {
	var locale = PME.Util.locale();

	var ldo = 'dmy';
	switch (locale[1]) {
		// middle-endian
		case 'US': // The United States
		case 'BZ': // Belize
		case 'FM': // The Federated States of Micronesia
		case 'PA': // Panama
		case 'PH':	// The Philippines
		case 'PW':	// Palau
		case 'ZW': // Zimbabwe
			ldo = 'mdy';
			break;

		// big-endian
		case 'fa': // Persian
		case 'AL': // Albania
		case 'CA': // Canada
		case 'CN': // China
		case 'HU': // Hungary
		case 'JP': // Japan
		case 'KE': // Kenya
		case 'KR': // Korea
		case 'LT': // Lithuania
		case 'LV': // Latvia
		case 'MN': // Mongolia
		case 'SE': // Sweden
		case 'TW': // Taiwan
		case 'ZA': // South Africa
			ldo = 'ymd';
			break;

		// little-endian
		default:
			ldo = 'dmy';
	}
	return ldo;
}; 

PME.Util.formatDate = function(date, shortFormat) {
	var localeDateOrder = PME.Util.getLocaleDateOrder();
	var formattedDate = localeDateOrder[0]+"/"+localeDateOrder[1]+"/"+localeDateOrder[2];
	return formattedDate.replace("y", (date.year !== undefined ? date.year : "00"))
	             .replace("m", (date.month !== undefined ? 1+date.month : "0"))
	             .replace("d", (date.day !== undefined ? date.day : "0"));
};

PME.Util.cleanTags = function(str) {
	return str.replace(/<br[^>]*>/gi, "\n").replace(/<[^>]+>/g, "");
};

PME.Util.strToDate = function(str) {
	var date = {};
	
	// return empty date if string is undefined
	if (! string) return date;
	
	var lc = str.toLowerCase();	
	if (lc === "yesterday" || lc === "today" || lc === "tomorrow") {
		var d = new Date();
		if (lc === "yesterday")
			d = d.setDate(d.getDate() - 1);
		if (lc === "tomorrow")
			d = d.setDate(d.getDate() + 1);
		
		date.year = d.getFullYear();
		date.month = d.getMonth();
		date.day = d.getDate();
		return date;
	}
	
	str.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s+/, " ");
	
	var _slashRe = /^(.*?)\b([0-9]{1,4})(?:(\/)([0-9]{1,2}))?(?:(\/)([0-9]{1,4}))?((?:\b|[^0-9]).*?)$/;
	var m = str.match(_slashRe);
	
	// str matched pattern {date part}/{date part}/{date part}
	if(m && (m[2] && m[4] && m[6])) {
		// figure out date based on parts
		if(m[2].length == 3 || m[2].length == 4) {
			// ISO 8601 style date (big endian)
			date.year = m[2];
			date.month = m[4];
			date.day = m[6];
		} else if(m[2] && !m[4] && m[6]) {
			date.month = m[2];
			date.year = m[6];
		} else {
			// local style date (middle or little endian)
			date.year = m[6];
			
			var locale = PME.Util.locale();
			if(locale[1] == "US" ||	// The United States
			   locale[1] == "FM" ||	// The Federated States of Micronesia
			   locale[1] == "PW" ||	// Palau
			   locale[1] == "PH") {	// The Philippines
				date.month = m[2];
				date.day = m[4];
			} else {
				date.month = m[4];
				date.day = m[2];
			}
		}
		
		if(date.year) date.year = parseInt(date.year, 10);
		if(date.day) date.day = parseInt(date.day, 10);
		if(date.month) {
			date.month = parseInt(date.month, 10);
			
			if(date.month > 12) {
				// swap day and month
				var tmp = date.day;
				date.day = date.month
				date.month = tmp;
			}
		}
		
		// sanity check
		if((!date.month || date.month <= 12) && (!date.day || date.day <= 31)) {
			if(date.year && date.year < 100) {	// for two digit years, determine proper
												// four digit year
				var today = new Date();
				var year = today.getFullYear();
				var twoDigitYear = year % 100;
				var century = year - twoDigitYear;
				
				if(date.year <= twoDigitYear) {
					// assume this date is from our century
					date.year = century + date.year;
				} else {
					// assume this date is from the previous century
					date.year = century - 100 + date.year;
				}
			}
			
			if(date.month) date.month--;		// subtract one for JS style
			PME.debug("DATE: retrieved with algorithms: "+JSON.stringify(date));
			
			date.part = m[1]+m[7];
		} else {
			// give up; we failed the sanity check
			PME.debug("DATE: algorithms failed sanity check");
			date = {"part":string};
		}
	} else {
		PME.debug("DATE: could not apply algorithms");
		date.part = string;
	}
	
	// couldn't find something with the slash format; use regexp for YEAR
	if(!date.year) {
		var _yearRe = /^(.*?)\b((?:circa |around |about |c\.? ?)?[0-9]{1,4}(?: ?B\.? ?C\.?(?: ?E\.?)?| ?C\.? ?E\.?| ?A\.? ?D\.?)|[0-9]{3,4})\b(.*?)$/i;
		var m = str.match(_yearRe);
		if(m) {
			date.year = m[2];
			date.part = m[1]+m[3];
			PME.debug("DATE: got year ("+date.year+", "+date.part+")");
		}
	}
	
	// MONTH
	if(!date.month) {
		// compile month regular expression
		var months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul',
			'aug', 'sep', 'oct', 'nov', 'dec'];
		
		var _monthRe = new RegExp("^(.*)\\b("+months.join("|")+")[^ ]*(?: (.*)$|$)", "i");
		
		var m = str.match(_monthRe);
		if(m) {
			date.month = months.indexOf(m[2].toLowerCase()) ;
			date.part = m[1]+m[3];
			PME.debug("DATE: got month ("+date.month+", "+date.part+")");
		}
	}
	
	// DAY
	if(!date.day) {
		
		var daySuffixes = "st, nd, rd, th".replace(/, ?/g, "|");
		_dayRe = new RegExp("\\b([0-9]{1,2})(?:"+daySuffixes+")?\\b(.*)", "i");
		
		var m = str.match(_dayRe);
		if(m) {
			var day = parseInt(m[1], 10);
			// Sanity check
			if (day <= 31) {
				date.day = day;
				if(m.index > 0) {
					date.part = date.part.substr(0, m.index);
					if(m[2]) {
						date.part += " "+m[2];
					}
				} else {
					date.part = m[2];
				}
				
				PME.debug("DATE: got day ("+date.day+", "+date.part+")");
			}
		}
	}
	
	// clean up date part
	if(date.part) {
		date.part = date.part.replace(/^[^A-Za-z0-9]+/, "").replace(/[^A-Za-z0-9]+$/, "");
	}
	
	if(date.part === "" || date.part == undefined) {
		delete date.part;
	}
	
	return date;
};

PME.Util.text2html = function(str, singleNewlineIsParagraph) {
	str = PME.Util.htmlSpecialChars(str);
	
	// \n => <p>
	if (singleNewlineIsParagraph) {
		str = '<p>'
				+ str.replace(/\n/g, '</p><p>')
					.replace(/  /g, '&nbsp; ')
			+ '</p>';
	}
	// \n\n => <p>, \n => <br/>
	else {
		str = '<p>'
				+ str.replace(/\n\n/g, '</p><p>')
					.replace(/\n/g, '<br/>')
					.replace(/  /g, '&nbsp; ')
			+ '</p>';
	}
	return str.replace(/<p>\s*<\/p>/g, '<p>&nbsp;</p>');
};

PME.Util.htmlSpecialChars = function(str) {	
	return str.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
};

// this seems to only be used in export for BibTeX
PME.Util.removeDiacritics = function(str, lowerCaseOnly) {
	return str; 
};

PME.Util.xpath = function(nodes, selector, namespaces) {
	var out = [];

	each(makeArray(nodes), function(node) {
		var doc = node.ownerDocument ? node.ownerDocument : (node.documentElement ? node : null);

		function resolver(prefix) { return namespaces && namespaces[prefix]; }

		if ("evaluate" in doc) {
			var xp = doc.evaluate(selector, node, resolver, XPathResult.ANY_TYPE, null),
				el;

			while (el = xp.iterateNext())
				out.push(el);
		}
		else if ("selectNodes" in node) {
			if (namespaces) {
				var selNS = map(namespaces, function(url, prefix) {
					return 'xmlns:' + prefix + '="' + url + '"';
				});
				doc.setProperty("SelectionNamespaces", selNS.join(" "));
			}

			var sn = node.selectNodes(selector);
			for (var i=0; i < sn.length; ++i)
				out.push(sn[i]);
		}
	});
	
	return out;
};

PME.Util.xpathText = function(nodes, selector, namespaces, delim) {
	nodes = PME.Util.xpath(nodes, selector, namespaces);
	if (! nodes.length)
		return null;
	
	var text = map(nodes, function(node) {
		return node.textContent || node.innerText || node.text || node.nodeValue;
	});

	return text.join(delim !== undefined ? delim : ", ");
};

/*
 * Generates an item in the format returned by item.fromArray() given an
 * OpenURL version 1.0 contextObject
 *
 * accepts an item array to fill, or creates and returns a new item array
 * POSSIBLE TODO: rewrite in PME style (picture Psy on his horse)
 */
PME.Util.parseContextObject = function(co, item) {
	if(!item) {
		var item = [];
		item.creators = [];
	}
	
	var coParts = co.split("&");
	
	// get type
	for(var i=0; i<coParts.length; i++) {
		if(coParts[i].substr(0, 12) == "rft_val_fmt=") {
			var format = decodeURIComponent(coParts[i].substr(12));
			if(format == "info:ofi/fmt:kev:mtx:journal") {
				item.itemType = "journalArticle";
				break;
			} else if(format == "info:ofi/fmt:kev:mtx:book") {
				if(coParts.indexOf("rft.genre=bookitem") !== -1) {
					item.itemType = "bookSection";
				} else if(coParts.indexOf("rft.genre=conference") !== -1 || coParts.indexOf("rft.genre=proceeding") !== -1) {
					item.itemType = "conferencePaper";
				} else if(coParts.indexOf("rft.genre=report") !== -1) {
					item.itemType = "report";
				} else if(coParts.indexOf("rft.genre=document") !== -1) {
					item.itemType = "document";
				} else {
					item.itemType = "book";
				}
				break;
			} else if(format == "info:ofi/fmt:kev:mtx:dissertation") {
				item.itemType = "thesis";
				break;
			} else if(format == "info:ofi/fmt:kev:mtx:patent") {
				item.itemType = "patent";
				break;
			} else if(format == "info:ofi/fmt:kev:mtx:dc") {
				item.itemType = "webpage";
				break;
			}
		}
	}
	if(!item.itemType) {
		return false;
	}
	
	var pagesKey = "";
	
	// keep track of "aucorp," "aufirst," "aulast"
	var complexAu = [];
	
	for(var i=0; i<coParts.length; i++) {
		var keyVal = coParts[i].split("=");
		var key = keyVal[0];
		var value = decodeURIComponent(keyVal[1].replace(/\+|%2[bB]/g, " "));
		if(!value) {
			continue;
		}
		
		if(key == "rft_id") {
			var firstEight = value.substr(0, 8).toLowerCase();
			if(firstEight == "info:doi") {
				item.DOI = value.substr(9);
			} else if(firstEight == "urn:isbn") {
				item.ISBN = value.substr(9);
			} else if(value.match(/^https?:\/\//)) {
				item.url = value;
				item.accessDate = "";
			}
		} else if(key == "rft.btitle") {
			if(item.itemType == "book" || item.itemType == "report") {
				item.title = value;
			} else if(item.itemType == "bookSection" || item.itemType == "conferencePaper") {
				item.publicationTitle = value;
			}
		} else if(key == "rft.atitle"
				&& ["journalArticle", "bookSection", "conferencePaper"].indexOf(item.itemType) !== -1) {
			item.title = value;
		} else if(key == "rft.jtitle" && item.itemType == "journalArticle") {
			item.publicationTitle = value;
		} else if(key == "rft.stitle" && item.itemType == "journalArticle") {
			item.journalAbbreviation = value;
		} else if(key == "rft.title") {
			if(["journalArticle", "bookSection", "conferencePaper"].indexOf(item.itemType) !== -1) {
				item.publicationTitle = value;
			} else {
				item.title = value;
			}
		} else if(key == "rft.date") {
			if(item.itemType == "patent") {
				item.issueDate = value;
			} else {
				item.date = value;
			}
		} else if(key == "rft.volume") {
			item.volume = value;
		} else if(key == "rft.issue") {
			item.issue = value;
		} else if(key == "rft.pages") {
			pagesKey = key;
			item.pages = value;
		} else if(key == "rft.spage") {
			if(pagesKey != "rft.pages") {
				// make pages look like start-end
				if(pagesKey == "rft.epage") {
					if(value != item.pages) {
						item.pages = value+"-"+item.pages;
					}
				} else {
					item.pages = value;
				}
				pagesKey = key;
			}
		} else if(key == "rft.epage") {
			if(pagesKey != "rft.pages") {
				// make pages look like start-end
				if(pagesKey == "rft.spage") {
					if(value != item.pages) {
						item.pages = item.pages+"-"+value;
					}
				} else {
					item.pages = value;
				}
				pagesKey = key;
			}
		} else if(key == "rft.issn" || (key == "rft.eissn" && !item.ISSN)) {
			item.ISSN = value;
		} else if(key == "rft.aulast" || key == "rft.invlast") {
			var lastCreator = complexAu[complexAu.length-1];
			if(complexAu.length && !lastCreator.lastName && !lastCreator.institutional) {
				lastCreator.lastName = value;
			} else {
				complexAu.push({lastName:value, creatorType:(key == "rft.aulast" ? "author" : "inventor"), offset:item.creators.length});
			}
		} else if(key == "rft.aufirst" || key == "rft.invfirst") {
			var lastCreator = complexAu[complexAu.length-1];
			if(complexAu.length && !lastCreator.firstName && !lastCreator.institutional) {
				lastCreator.firstName = value;
			} else {
				complexAu.push({firstName:value, creatorType:(key == "rft.aufirst" ? "author" : "inventor"), offset:item.creators.length});
			}
		} else if(key == "rft.au" || key == "rft.creator" || key == "rft.contributor" || key == "rft.inventor") {
			if(key == "rft.contributor") {
				var type = "contributor";
			} else if(key == "rft.inventor") {
				var type = "inventor";
			} else {
				var type = "author";
			}
			
			if(value.indexOf(",") !== -1) {
				item.creators.push(PME.Util.cleanAuthor(value, type, true));
			} else {
				item.creators.push(PME.Util.cleanAuthor(value, type, false));
			}
		} else if(key == "rft.aucorp") {
			complexAu.push({lastName:value, isInstitution:true});
		} else if(key == "rft.isbn" && !item.ISBN) {
			item.ISBN = value;
		} else if(key == "rft.pub" || key == "rft.publisher") {
			item.publisher = value;
		} else if(key == "rft.place") {
			item.place = value;
		} else if(key == "rft.tpages") {
			item.numPages = value;
		} else if(key == "rft.edition") {
			item.edition = value;
		} else if(key == "rft.series") {
			item.series = value;
		} else if(item.itemType == "thesis") {
			if(key == "rft.inst") {
				item.publisher = value;
			} else if(key == "rft.degree") {
				item.type = value;
			}
		} else if(item.itemType == "patent") {
			if(key == "rft.assignee") {
				item.assignee = value;
			} else if(key == "rft.number") {
				item.patentNumber = value;
			} else if(key == "rft.appldate") {
				item.date = value;
			}
		} else if(format == "info:ofi/fmt:kev:mtx:dc") {
			if(key == "rft.identifier") {
				if(value.length > 8) {	// we could check length separately for
										// each type, but all of these identifiers
										// must be > 8 characters
					if(value.substr(0, 5) == "ISBN ") {
						item.ISBN = value.substr(5);
					} else if(value.substr(0, 5) == "ISSN ") {
						item.ISSN = value.substr(5);
					} else if(value.substr(0, 8) == "urn:doi:") {
						item.DOI = value.substr(4);
					} else if(value.substr(0, 7) == "http://" || value.substr(0, 8) == "https://") {
						item.url = value;
					}
				}
			} else if(key == "rft.description") {
				item.abstractNote = value;
			} else if(key == "rft.rights") {
				item.rights = value;
			} else if(key == "rft.language") {
			  	item.language = value;
			}  else if(key == "rft.subject") {
				item.tags.push(value);
			} else if(key == "rft.type") {
				if(PME.Util.itemTypeExists(value)) item.itemType = value;
			} else if(key == "rft.source") {
				item.publicationTitle = value;
			}
		}
	}

	// To maintain author ordering when complex and simple authors are combined,
	// we remember where they were and the correct offsets
	var inserted = 0;
	
	// combine two lists of authors, eliminating duplicates
	for(var i=0; i<complexAu.length; i++) {
		var pushMe = true;
		var offset = complexAu[i].offset;
		delete complexAu[i].offset;
		for(var j=0; j<item.creators.length; j++) {
			// if there's a plain author that is close to this author (the
			// same last name, and the same first name up to a point), keep
			// the plain author, since it might have a middle initial
			if(item.creators[j].lastName == complexAu[i].lastName &&
			   (item.creators[j].firstName == complexAu[i].firstName == "" ||
			   (item.creators[j].firstName.length >= complexAu[i].firstName.length &&
			   item.creators[j].firstName.substr(0, complexAu[i].firstName.length) == complexAu[i].firstName))) {
				pushMe = false;
				break;
			}
		}
		// Splice in the complex creator at the correct location,
		// accounting for previous insertions
		if(pushMe) {
			item.creators.splice(offset + inserted, 0, complexAu[i]);
			inserted++;
		}
	}
	
	return item;
};



PME.Util.retrieveDocument = function(url) {
	return "";
};

PME.Util.processDocuments = function(urls, processor, callback, exception) {
	log("processDocuments", urls);
	
	urls = makeArray(urls);
	
	for(var i=0; i<urls.length; i++) {
		log("url: " + urls[i]);
		processor(document, urls[i]);
	}

	if(callback) callback();
};


// ------------------------------------------------------------------------
//  _   _ _____ _____ ____  
// | | | |_   _|_   _|  _ \ 
// | |_| | | |   | | | |_) |
// |  _  | | |   | | |  __/ 
// |_| |_| |_|   |_| |_|    
//                          
// ------------------------------------------------------------------------
PME.Util.HTTP = {};

function hostNameForURL(url) {
	return (/^(https?:\/\/[^\/]+)\//.exec(pageURL)[1] || "").toLowerCase();
}

function httpRequest(reqURL, callback) {
	var pageHost = hostNameForURL(pageURL),
		reqHost = hostNameForURL(reqURL),
		request = null;

	if (! reqHost.length)
		reqHost = pageHost;

	try {
		if (window.XDomainRequest && pageHost != reqHost)
			request = new XDomainRequest();
		else if (window.XMLHttpRequest)
			request = new XMLHttpRequest();
		else if (window.ActiveXObject)
			request = new ActiveXObject("Microsoft.XMLHTTP");
	} catch(e) {}

	// -- xhr events
	function loadHandler()  { callback("load", request); }
	function errorHandler() { callback("error", request); }
	function abortHandler() { callback("abort", request); }

	if (request) {
		if ("addEventListener" in request) {
			request.addEventListener("load", loadHandler, false);
			request.addEventListener("error", errorHandler, false);
			request.addEventListener("abort", abortHandler, false);
		}
		else {
			request.onload = loadHandler;
			request.onerror = errorHandler;
			request.onabort = abortHandler;
		}
	}

	return request;
}

PME.Util.HTTP.doGet = function(url, callback, charset) {
	log("HTTP GET request: ", url);
	var request = httpRequest(url, function(status) {
		log("HTTP GET status: ", status, request);

		if (status == "load")
			callback(request.responseText);
		else
			callback("");

		taskEnded();
	});

	taskStarted();

	try {
		request.open("GET", url, true);
		request.send();
	}
	catch(e) {
		fatal("HTTP GET failed", e);
	}
};

PME.Util.HTTP.doPost = function(url, data, callback, headers, charset) {
	log("HTTP POST request: ", url, data);
	var request = httpRequest(url, function(status) {
		log("HTTP POST status: ", status, request);

		if (status == "load")
			callback(request.responseText);
		else
			callback("");

		taskEnded();
	});

	taskStarted();

	if (! headers)
		headers = {"Content-Type": "application/x-www-form-urlencoded"};
	else if (! "Content-Type" in headers)
		headers["Content-Type"] = "application/x-www-form-urlencoded";

	try {
		request.open("POST", url, true);
		for (var hdrName in headers) 
			request.setRequestHeader(hdrName, headers[hdrName]);
		request.send(data);
	}
	catch(e) {
		fatal("HTTP POST failed", e);
	}
};



// ------------------------------------------------------------------------
//   __ _ _ _                
//  / _(_) | |_ ___ _ __ ___ 
// | |_| | | __/ _ \ '__/ __|
// |  _| | | ||  __/ |  \__ \
// |_| |_|_|\__\___|_|  |___/
//                           
// ------------------------------------------------------------------------
function ValueFilter() {
	var filters = [], st;

	function addFilter(fn) {
		filters.push(fn);
		return st;
	}

	function _applyFilters(vals, context) {
		for (var fi=0; fi<filters.length; ++fi) {
			vals = purge(flatten(vals));

			for (var vi=0; vi<vals.length; ++vi) {
				try {
					vals[vi] = filters[fi](vals[vi], context);
				}
				catch(ex) {	}
			}

			vals = purge(vals);
		}

		return flatten(vals);
	}

	st = {
		addFilter: addFilter,
		_applyFilters: _applyFilters,

		trim: function() { return addFilter(
			function(str) {
				return PME.Util.trim(str);
			}
		);},
		trimInternal: function() { return addFilter(
			function(str) {
				return PME.Util.trimInternal(str);
			}
		);},
		replace: function(find, subst) { return addFilter(
			function(str) {
				return str.replace(find, subst);
			}
		);},
		unescape: function() { return addFilter(
			function(str) {
				return unescape(str);
			}
		);},
		unescapeHTML: function() { return addFilter(
			function(str) {
				return str; // TBI
			}
		);},
		cleanAuthor: function(type, isReversed) { return addFilter(
			function(str) {
				return str; // TBI
			}
		);},
		match: function(against, matchIndex) { return addFilter(
			function(str) {
				var m = str.match(against);
				if (m)
					m = m[matchIndex || 0];
				return m;
			}
		);},
		prepend: function(prefix) { return addFilter(
			function(str) {
				return prefix + str;
			}
		);},
		append: function(suffix) { return addFilter(
			function(str) {
				return str + suffix;
			}
		);},
		key: function(keyName) { return addFilter(
			function(obj) {
				return obj[keyName];
			}
		);},
		split: function(sep) { return addFilter(
			function(str) {
				return str.split(sep);
			}
		);},
		capitalizeTitle: function() { return addFilter(
			function(str) {
				return PME.Util.capitalizeTitle(str);
			}
		);}
	};
	return st;
}

function PageText() {
	var pt = ValueFilter();

	pt.evaluate = function(doc, url) {
		var vals = url._applyFilters([doc.documentElement.innerHTML], doc);
		return vals.length ? vals : false;
	};

	return pt;
}

function Url() {
	var lk = ValueFilter();

	lk.evaluate = function(doc, url) {
		var vals = lk._applyFilters([url], doc);
		return vals.length ? vals : false;
	}

	return lk;
}

function Xpath(selector) {
	var xp = ValueFilter();
	xp.text = function() { return xp.addFilter(
		function(obj) {
			return obj.textContent || obj;
		}
	);};

	xp.evaluate = function(doc, url) {
		var res  = doc.evaluate(selector, doc, null, XPathResult.ANY_TYPE, null),
			type = res.resultType,
			vals = [],
			v;

		if (type == XPathResult.STRING_TYPE)
			vals.push(res.stringValue);
		else {
			if (type == XPathResult.ORDERED_NODE_ITERATOR_TYPE || type == XPathResult.UNORDERED_NODE_ITERATOR_TYPE) {
				while(v = res.iterateNext())
					vals.push(v);
			}
		}

		vals = xp._applyFilters(vals, doc);
		return vals.length ? vals : false;
	};

	return xp;
}


// ------------------------------------------------------------------------
//                                         
//  ___  ___ _ __ __ _ _ __   ___ _ __ ___ 
// / __|/ __| '__/ _` | '_ \ / _ \ '__/ __|
// \__ \ (__| | | (_| | |_) |  __/ |  \__ \
// |___/\___|_|  \__,_| .__/ \___|_|  |___/
//                    |_|                  
// ------------------------------------------------------------------------
window.FW = (function(){
	var scrapers = [];

	function ScraperBase(spec) {
		function evalItem(item, doc, url) {
			if(typeof item == "object") {
				if(item instanceof Array) {
					return flatten(
						map(item, function(subItem) {
							return evalItem(subItem, doc, url);
						})
					);
				}
				return item.evaluate(doc, url);
			}

			if (typeof item == "function")
				return item(doc, url);

			return item;
		}

		return { spec: spec, evalItem: evalItem };
	}

	function Scraper(spec) {
		var scrp = ScraperBase(spec);

		scrp.run = function(doc, url, itemCallback, completionCallback) {
			var skipList  = { detect:1, itemType:1, attachments:1 },
				multiList = { creators: 1, tags: 1 },

				item = map(spec, function(val, key) {
					if (key in skipList)
						return undefined;

					var procVal = scrp.evalItem(val, doc, url);
					// log("Scraper got kv", key, procVal);

					if (key in multiList)
						return flatten([procVal]);

					return (procVal instanceof Array) ? procVal[0] : procVal;
				});

			item.itemType = spec.itemType;
			itemCallback(item);
			completionCallback();
		};

		scrapers.push(scrp);
		return scrp;
	}

	function MultiScraper(spec) {
		var scrp = ScraperBase(spec);

		scrp.run = function(doc, url, itemCallback, completionCallback) {
			// TBI
			completionCallback();
		};

		scrapers.push(scrp);
		return scrp;
	}

	function detectWeb(doc, url) {
		var eligible = filter(scrapers, function(sc) {
			return !!sc.evalItem(sc.spec.detect, doc, url);
		});

		log("FW.detectWeb eligible scrapers", eligible);

		return eligible.length > 0;
	}

	function doWeb(doc, url) {
		log("FW.doWeb called");

		var scraper = filter(scrapers, function(sc) {
			return !!sc.evalItem(sc.spec.detect, doc, url);
		})[0];

		log("FW.doWeb using scraper", scraper);

		scraper.run(doc, url,
			function itemDone(item) {
				PME.items.push(item);
			},
			function allDone() {
				PME.done();
			}
		);
	}


	return {
		Scraper: Scraper,
		MultiScraper: MultiScraper,
		PageText: PageText,
		Xpath: Xpath,
		Url: Url,
		
		detectWeb: detectWeb,
		doWeb: doWeb
	};
}());



// ------------------------------------------------------------------------
//                  _       
//  _ __ ___   __ _(_)_ __  
// | '_ ` _ \ / _` | | '_ \ 
// | | | | | | (_| | | | | |
// |_| |_| |_|\__,_|_|_| |_|
//                                
// ------------------------------------------------------------------------
PME.getPageMetaData = function(callback) {
	log("getPageMetdaData start");
	try {
		// main accesspoint
		pageURL = document.location.href;
		pageDoc = document;
		pmeCallback = callback;

		var trans = Registry.matchURL(pageURL);
		if (! trans)
			completed(null);
		else {
			var t = PME.loadTranslator("web");
			t.setTranslator(trans);
			t.translate();
		}
	}
	catch(e) {
		log("ERROR during initialisation", e, e.message);
		completed(null);
	}
};

}());
