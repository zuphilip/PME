var fs = require('fs');
var path = require('path');
var uglifyjs = require('uglify-js');
var common = require('./common');
var _builderConfigFilesLocation = common.config.builderConfigFilesLocation;
var _connectorsCommonFilesLocation = common.config.connectorsCommonFilesLocation;
var _zoteroFilesLocation = common.config.zoteroFilesLocation;
var _zoteroSrcFilesLocation = common.config.zoteroSrcFilesLocation;
var _buildLocation = common.config.buildLocation;

function uglify (dir) {
  console.log('Uglifying')
  common.asyncProcessCnt++;
  fs.readdir(dir, function(err, files) {
    common.asyncProcessCnt--;
    files.forEach(function(file) {
      if(path.extname(file) == ".js") {
        var origName = path.join(dir, file);
        var newName = path.join(dir, path.basename(file).replace("_tmp", ""));
        if(common.debug) {
          common.asyncProcessCnt++;
          fs.rename(origName, newName, function() {
            common.asyncProcessCnt--;
          });
        }
        else {
          var result = uglifyjs.minify(origName);
          common.asyncProcessCnt++;
          fs.writeFile(newName, result.code, function() {
            common.asyncProcessCnt--;
            if(origName.indexOf("_tmp") > 0 && path.basename(newName).indexOf(path.basename(origName) == 0)) {
              common.asyncProcessCnt++;
              fs.unlink(origName, function() {
                common.asyncProcessCnt--
              });
            }
          });
        }
      }
    });
  });
}

module.exports = new function() {
  this.buildBookmarklet = function() {
    console.log("Starting Bookmarklet");
    var root = path.join(_buildLocation, "bookmarklet");
    common.doPrepWork(root, function() {
      common.asyncProcessCnt++;
      fs.mkdir(root, function() {
        common.asyncProcessCnt--;
        var xpcom = path.join(_zoteroFilesLocation, "chrome/content/zotero/xpcom/");
        var bookmarklet = path.join(_zoteroSrcFilesLocation, "bookmarklet");
        var iframe_tmp = path.join(root, "iframe_tmp.js");
        var common_tmp = path.join(root, "common_tmp.js");
        var inject_tmp = path.join(root, "inject_tmp.js");

        common.appendCode([
          path.join(xpcom, "connector/connector.js"),
          path.join(xpcom, "translation/tlds.js"),
          path.join(bookmarklet, "translator.js"),
          path.join(_connectorsCommonFilesLocation, "messaging.js"),
          path.join(bookmarklet, "iframe_base.js")
        ], iframe_tmp/*, {
         fileName: ["connector.js"],
         pattern: /(CONNECTOR_URI = ")http:\/\/.+(\/";)/g,
         replacement: "$1https://www.zotero.org$2"
         }*/);
        common.appendCode([
          path.join(_connectorsCommonFilesLocation, "zotero.js"),
          path.join(_builderConfigFilesLocation, "config.js"),
          path.join(xpcom, "debug.js"),
          path.join(_connectorsCommonFilesLocation, "errors_webkit.js"),
          path.join(_connectorsCommonFilesLocation, "http.js"),
          path.join(xpcom, "xregexp/xregexp.js"),
          path.join(xpcom, "xregexp/addons/build.js"),
          path.join(xpcom, "xregexp/addons/matchrecursive.js"),
          path.join(xpcom, "xregexp/addons/unicode/unicode-base.js"),
          path.join(xpcom, "xregexp/addons/unicode/unicode-categories.js"),
          path.join(xpcom, "xregexp/addons/unicode/unicode-zotero.js"),
          path.join(xpcom, "utilities.js"),
          path.join(bookmarklet, "messages.js")
        ], common_tmp, common.versionFix());
        common.appendCode([
          path.join(xpcom, "connector/cachedTypes.js"),
          path.join(xpcom, "date.js"),
          path.join(_connectorsCommonFilesLocation, "inject/http.js"),
          path.join(xpcom, "openurl.js"),
          path.join(_connectorsCommonFilesLocation, "inject/progressWindow.js"),
          path.join(xpcom, "rdf/init.js"),
          path.join(xpcom, "rdf/uri.js"),
          path.join(xpcom, "rdf/term.js"),
          path.join(xpcom, "rdf/identity.js"),
          path.join(xpcom, "rdf/match.js"),
          path.join(xpcom, "rdf/rdfparser.js"),
          path.join(xpcom, "translation", "translate.js"),
          path.join(xpcom, "connector/translate_item.js"),
          path.join(_connectorsCommonFilesLocation, "inject/translate_inject.js"),
          path.join(_connectorsCommonFilesLocation, "inject/translator.js"),
          path.join(xpcom, "connector/typeSchemaData.js"),
          path.join(xpcom, "utilities_translate.js"),
          path.join(bookmarklet, "messaging_inject.js"),
          path.join(bookmarklet, "inject_base.js")
        ], inject_tmp, common.translateFix());

        common.copyCode(bookmarklet, root, [
            "loader.js",
            "ie_hack.js",
            "upload.js",
            "bookmarklet.html",
            "debug_mode.html",
            "iframe.html",
            "iframe_ie.html",
            "auth_complete.html",
            "itemSelector/itemSelector_browserSpecific.js"
          ], [
            path.join(_connectorsCommonFilesLocation, 'itemSelector')
          ],
          {
            fileName: ["loader.js", "iframe.html", "iframe_ie.html"],
            pattern: /(?:(baseURL\s*=\s*").+")|(?:(".js)")|(?:(<script .+\.js)"(><\/script>))|(\n<body><\/body>\n)/g,
            replacement: function($0, $1, $2, $3, $4, $5) {
              if($1)
                return $1 + common.config.baseUrl + '"';
              if($2)
                return $2 + '?"+' + common.config.buildID;
              if(($3 && $4) || $5) {
                if(common.debug) {
                  var ie = '';
                  if(RegExp.leftContext.indexOf('_ie') > -1) {
                    ie = '_ie';
                  }
                  if($3 || $4)
                    return "";
                  if($5) {
                    var script = "<script>\n" +
                      "var d = new Date().valueOf();\n" +
                      "var script1 = document.createElement('script');\n" +
                      "script1.setAttribute('src', 'common" + ie + ".js?' + d);\n" +
                      "script1.onload = function(){\n" +
                      "\tvar script2 = document.createElement('script');\n" +
                      "\tscript2.setAttribute('src', 'iframe" + ie + ".js?' + d);\n" +
                      "\tdocument.getElementsByTagName('body')[0].appendChild(script2);\n" +
                      "}\n" +
                      "document.getElementsByTagName('body')[0].appendChild(script1);\n" +
                      "</script>\n";
                    return $5 + script;
                  }
                }
                else
                  return $3 + '?' + common.config.buildID + '"' + $4;
              }
            }
          }
        );
        common.copyFile(path.join(bookmarklet, "htaccess"), path.join(root, ".htaccess"));

        common.copyImages(root);
      });
    })
    common.complete(function() {
      var interval = setInterval(function() {
        common.clearInt(interval, function() {
          console.log("complete bookmarklet");
        });
      }, 10);
      uglify(root);
    });
  }
}