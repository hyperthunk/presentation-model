/**
 * xslTransform
 * (soon to be) jQuery wrapper for Sarissa <http://sarissa.sourceforge.net/>
 *
 * @version   1.0
 * @since     2010-06-24
 * @copyright Copyright (c) 2010 CCCS Ltd. http://craigcook.co.uk
 * @author    Craig Cook
 * @svn       http://craigcook.co.uk/svn/cccs/jscript/xsltransform/trunk/jquery.xslTransform.js
 * @requires  >= jQuery 1.4.2           http://jquery.com/
 * @requires  >= sarissa.js 0.9.9.4     http://sarissa.sourceforge.net/
 * @requires  >= jsMap.js 1.0           http://craigcook.co.uk
 */

var xslTransform = {
    xsls: new Map(),
    init: function() {
        try {
            //TODO: is this not just checking for > 1 ???
            parseFloat(jQuery.fn.jquery) >= 1;
        } catch(e) {
            alert('xslTransform requires jQuery 1.4.2 or higher. Please load it prior to xslTransform')
        }
        try {
            Sarissa;
        } catch(e) {
            alert('Sarissa is missing. Please load it prior to xslTransform')
        }
    },
    loadTransform: function(url) { //Deprecated???
        jQuery.get(url, function(xml) {
            xslTransform.processor.importStylesheet(xml);
        });
    },
    //@Private
    transform: function(element, xsl, xml, callback) {
        var processor = new XSLTProcessor();
        var assetXml = Sarissa.getDomDocument();

        processor.importStylesheet(xsl);
        assetXml = xml;
        var newDocument = processor.transformToDocument(assetXml);
        var serialized = new XMLSerializer();
        jQuery(element).html(jQuery(serialized.serializeToString(newDocument)).children());

        if (callback) {
            callback();
        }
    },
    transformXml: function(element, xslUrl, xml, callback) {
        var xsl = xslTransform.xsls.get(xslUrl);
        if (xsl != undefined) {
            xslTransform.transform(element, xsl, xml, callback);
        } else {
            jQuery.get(xslUrl, function(xslXml) {
                xslTransform.xsls.put(xslUrl, xslXml);
                xslTransform.transform(element, xslXml, xml, callback);
            });
        }
    },
    transformUrl: function(element, xslUrl, xmlUrl, callback) {
        var xsl = xslTransform.xsls.get(xslUrl);
        if (xsl != undefined) {
            jQuery.get(xmlUrl, function(xml) {
                xslTransform.transform(element, xsl, xml, callback);
            });
        } else {
            jQuery.get(xslUrl, function(xslXml) {
                xslTransform.xsls.put(xslUrl, xslXml);
                jQuery.get(xmlUrl, function(xml) {
                    xslTransform.transform(element, xslXml, xml, callback);
                });
            });
        }
    },
    transformElements: function(items, xmlUrl, callback) {
        jQuery.get(xmlUrl, function(xml) {
            for (var i = 0; i < items.length; i++) {
                //Only do callback after last transform
                xslTransform.transformXml(
                        items[i].element,
                        items[i].xslUrl,
                        xml,
                        (i == (items.length-1) ? callback : null)
                        );
            }
        });
    }
};

xslTransform.init();

//TODO: move these into jQuery plugin
function transformXml(element, xslUrl, xml, callback) {
    xslTransform.transformXml(
            element,
            xslUrl,
            xml,
            callback
            );
}

function transformUrl(element, xslUrl, xmlUrl, callback) {
    xslTransform.transformUrl(
            element,
            xslUrl,
            xmlUrl,
            callback
            );
}

function transformElements(items, xmlUrl, callback) {
    xslTransform.transformElements(
            items,
            xmlUrl,
            callback
            );
}

// jQuery.fn.doTransform = function(element, xsl, xml) {
// 	alert('Transforming ' + xml + ' with ' + xsl + ' onto ' + element);
// };
