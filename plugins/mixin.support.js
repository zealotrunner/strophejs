/**
 * Copyright 2009, Drakontas LLC
 * Ilya Braude
 * ilya@drakontas.com
 * 
 * This file provides support for mixin functionality for augmenting
 * strophe's XMPP responses
 * 
 */

Strophe.Util = Strophe.Util || {};
Strophe.Util.isArray = function(obj){
    try{
        return obj && obj.constructor.toString().match(/array/i) != null;
    } catch(e){
        return false;
    }
};


(function (callback) {

var Mixin = {};

/** 
 * Applies a Mixin list 'mixins' to the (DOM) object 'target'.
 * 'mixins' can be a list or a single mixin object. 
 * Any argument after 'mixins' will be interpreted in the same way
 * as 'mixins'.
 *
 * Returns: 
 *  target
 */
Mixin.apply =  function(target, mixins) {
    if (target) {
        for(var a = 1; a < arguments.length; a++){
            mixins = arguments[a];

            if(!mixins)
                continue;
            
            if(!Strophe.Util.isArray(mixins)){
                mixins = [mixins];
            }
            
            for(var m = 0; m < mixins.length; m++){
                var mixin = mixins[m];
                for (var i in mixin) {
                    if( mixin.hasOwnProperty(i) ){
                        target[i] = mixin[i];
                    }
                }
            }
        }
    }

    return target;
}


var Stanza = {
    /***
    Function getTo
    
    Retrieve the "to" value of the XMPP packet
    
    Returns: (String) - The "to" value of the XMPP packet 
    
     */        
    getTo: function() {
        return this.getAttribute("to");
    },
    
    /***
    Function getFrom
    
    Retrieve the "from" value of the XMPP packet
    
    Returns: (String) - The "from" value of the XMPP packet 
    
     */        
    getFrom: function() {
        return this.getAttribute("from");
    },

    /***
    Function getName
    
    Retrieve the name the XMPP packet tag
    
    Returns: (String) - The name of the tag of the XMPP packet 
    
     */        
    getName: function(){
        this.nodeName;
    },

    
    /***
    Function getType
    
    Retrieve the "type" of the XMPP packet
    
    Returns: (String) - The "type" of the XMPP packet 
    
     */        
    getType: function() {
        return this.getAttribute("type");
    },

    /***
    Function getId
    
    Retrieve the id of the XMPP packet
    
    Returns: (String) - The id of the XMPP packet 
    
     */
    getId: function() {
        return this.getAttribute("id");
    },

    
    getExtensionsByNS: function(namespaceURI) {
        var extensionsByNS = new Array(); 
        var x = this.getExtensions();
        for(var i=0; i < x.length; i++){
            if(x[i].getAttribute('xmlns') == namespaceURI){
                extensionsByNS.push(x[i]);
            }
        }
        return extensionsByNS;
    },
    
    getExtensions: function() {
        var extensionElems = this.getElementsByTagName("x");
        if(extensionElems == undefined || extensionElems == null){
            return [];
        }
        return extensionElems;
    },


    /***
     Function getError
     
    Retrieves the error returned with the stanza.  The error is
    represented as an object with the following properties: 'code',
    'type', 'condition'.  Code is the code of the error, type is the
    type of the error (limited set, see XMPP-CORE). Condition is the
    child element name of the error element.

    There may also be a 'text' property, if it has been included in the
    error stanza.
     
    Returns: (Object) - The object representing an error
    */
    getError: function() {
        var errorElem = this.getElementsByTagName("error");
        if(errorElem == undefined || 
           errorElem == null || 
           errorElem.length == 0){
            return null;
        }
        errorElem = errorElem[0];

        var error = {
            code: errorElem.getAttribute("code"),
            type: errorElem.getAttribute("type")
        };

        if( errorElem.childNodes.length > 0 ){
            error.condition = errorElem.childNodes[0].nodeName;
        }
        if( errorElem.childNodes.length > 1 ){
            error.condition_detail = errorElem.childNodes[1].nodeName;
        }

        var texts = errorElem.getElementsByTagName("text");
        if( texts.length > 0 ){
            error.text = Strophe.getText(texts[0]);
        }

        return error;
    },

    /**
     * Returns a helpful string representation of the error; uses getError().
     * Returns an empty strin if the stanza is not an error stanza.
     */
    getErrorText: function(){
        var e = this.getError();
        if(e){
            var error = e.condition;
            if(e.condition_detail){
                error += " (" + e.condition_detail + ")";
            }
            if(e.text){
                error += ": " + e.text;
            }

            return error;
        } else {
            return "";
        }
    }
};

var Message = Mixin.apply({
    /***
     Function getBody
     
     Retrieves the body element of the IQ packet
     
     Returns: (DOMNode) - The XML node of the query element
         
     */
    getBody: function() {
        var elems = this.getElementsByTagName("body");
        if( elems.length > 0 ){
            return elems.item(0);
        }
        return null;
    },


   getDelay: function() {
	   var delayElem = this.getElementsByTagName('delay');
	   if (!isNull(delayElem.length) && delayElem.length > 0){
	   	return delayElem[0].getAttribute('stamp');
	   }
	   return undefined;
   },
   
   getBodyText: function(){
	   var bodyElem = this.getElementsByTagName('body');
	   if (!isNull(bodyElem.length) && bodyElem.length > 0){
	   	return bodyElem[0].textContent;
	   }
	return false;
   }
}, Stanza);


var IQ = Mixin.apply({
    /***
     Function getQuery
     
     Retrieves the query element of the IQ packet
     
     Returns: (DOMNode) - The XML node of the query element
         
     */
    getQuery: function() {
        var elem = this.getElementsByTagName("query").item(0);
        return elem;
    },


    /***
     Function getQueryNS
     
     Retrieves the namespace value of the query element
     
     Returns: (String) - The value of the namespace attribute of the query element 
         
     */
    getQueryNS: function() {
        var query = this.getQuery();
        return query ? query.getAttribute("xmlns") : "";
    }
}, Stanza);


var Presence = Mixin.apply({
    getStatus: function(){
        return this.getStatuses()[0];
    },

    /**
     * Get contents of all status elements as an array
     */
    getStatuses: function(){
      var statuses = new Array();
      Strophe.forEachChild(this, 'status', function(child) {
         statuses.push(Strophe.getText(child));
      });
      return statuses;
    },

    getShow: function(){
        
    }
}, Stanza);


// add default stanza mixins to the Mixin namespace
Mixin.apply(Mixin, {
    Stanza: Stanza,
    Message: Message,
    IQ: IQ,
    Presence: Presence
});


if (callback) {
    callback(Mixin);
}

})(function () {
    window.Strophe.Mixin = arguments[0];
});


/**
 * Add some useful XML/DOM parsing functions modeled after jQuery
 */
(function (callback) {

// our own isArray function
var isArray = function(obj){
    try{
        return obj && obj.constructor.toString().match(/array/i) != null;
    } catch(e){
        return false;
    }
};


var Parser = function(data){
    if(this == window){
        // allow calling without new keyword
        return new Parser(data);
    }

    data = isArray(data) ? data : [data];
    for(var i = 0; i < data.length; i++){
        this.push(data[i]);
    }
    // update length property (doesn't happen on IE)
    this.length = i;
}

var parser_api = {
    get: function(index){
        return this[index];
    },

    eq: function(index){
        return new Parser([this.get(index)]);
    },

    each: function(func){
        if(func){
            for(var p in this){
                if(this.hasOwnProperty(p) && p != 'length'){
                    func(this[p]);
                }
            }
        }

        return this;
    },


    /**
     * Function: find
     *  
     * Finds all children of the elements that match
     * the given node name and namespace parameters.
     * 
     * Parameters:
     *  (String)     nodeName - (Optional) The node name to match.
     *  (String)     ns       - (Optional) The xmlns to match.
     *
     * Returns:
     *    A Parser instance (could be empty).
     *
     */
    find: function(nodeName, ns){
        var elements = [];
        if(!ns && ns === undefined){
            ns = null;
        }

        this.each(function(e){
            if(e !== undefined && e !== null){
                Strophe.forEachChild(e, nodeName, function (elem) {
                    if (ns == null || elem.getAttribute("xmlns") == ns ) {
                        elements.push(elem);
                    }
                });
            }
        });
        
        return new Parser(elements);
    },

    /**
     * Function: filter
     *  
     * Finds all elements that match
     * the given node name and namespace parameters.
     * 
     * Parameters:
     *  (String)     nodeName - (Optional) The node name to match.
     *  (String)     ns       - (Optional) The xmlns to match.
     *  (String)     filter   - (Optional) A custom filter function:
     *                             function(elem){return true/false}
     *
     * Returns:
     *    A Parser instance (could be empty).
     *
     */
    filter: function(nodeName, ns, filter){
        var elements = [];
        if(!ns && ns === undefined){
            ns = null;
        }

        filter = filter || function(e){
            if(e !== undefined && e !== null){
                if (e.nodeType == Strophe.ElementType.NORMAL &&
                    (!nodeName || Strophe.isTagEqual(e, nodeName)) && 
                    (ns == null || e.getAttribute("xmlns") == ns )) {
                    return true;
                }
            }
        }

        this.each(function(e){
            if(filter(e))
                elements.push(e);
        });
        
        return new Parser(elements);
    },


    /**
     * Function: attr
     *  
     * Finds all attribute values of elements that match
     * the given attribute name.
     * 
     * Parameters:
     *  (String)     attrName - The attribute name to match.
     *
     * Returns:
     *    A Parser instance (could be empty).
     *
     */
    attr: function(attrName){
        var result = []
        this.each(function(e){
            e.getAttribute && result.push(e.getAttribute(attrName));
        });

        return new Parser(result);
    }
}


Parser.prototype = new Array();

for(var i in parser_api){
    if( parser_api.hasOwnProperty(i) ){
        Parser.prototype[i] = parser_api[i];
    }
}


if (callback) {
    callback(Parser);
}

})(function () {
    $sp = window.Strophe.Parser = arguments[0];
});


