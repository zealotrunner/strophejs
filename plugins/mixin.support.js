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
        return this.tagName;
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
        namespaceURI = namespaceURI || "";
        return new Strophe.Parser(this).find(namespaceURI + "|x");
    },
    
    getExtensions: function() {
        return new Strophe.Parser(this).find("x");
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
        var errorElem = new Strophe.Parser(this).find("error").get(0);
        if(!errorElem){
            return null;
        }

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

        error.text = new Strophe.Parser(errorElem).find("text").text();

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
        return new Strophe.Parser(this).find("body").get(0);
    },


    /***
     * Function getDelay
     * Retreives the legacy specification's 'stamp' attribute from the
     * 'delay' element
     * 
     * Returns null if not found.
     */
    getDelay: function() {
        var delayElem = this.getElementsByTagName('delay');
        if (delayElem.length && delayElem.length > 0){
            return delayElem[0].getAttribute('stamp');
        }
        return undefined;
    },
    
    getBodyText: function(){
        var bodyElem = this.getElementsByTagName('body');
        if (bodyElem.length && bodyElem.length > 0){
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
    getQuery: function(ns) {
        ns = ns || "";
        return new Strophe.Parser(this).find(ns + "|query").get(0);
    },


    /***
     Function getQueryNS
     
     Retrieves the namespace value of the query element
     
     Returns: (String) - The value of the namespace attribute of the query element 
         
     */
    getQueryNS: function() {
        return new Strophe.Parser(this).find("query").attr("xmlns").get(0) || "";
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
        return new Strophe.Parser(this).find("show").text();
    },

    getPriority: function(){
        return new Strophe.Parser(this).find("priority").text();
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

var trimArray = function(array){
    for(var i = 0; i < array.length; i++){
        array[i] = array[i].replace(/^\s+|\s+$/g,"");
    }
    return array;
}

var Parser = function(data){
    if(this == window){
        // allow calling without new keyword
        return new Parser(data);
    }

    data = data || [];
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
     * Allows two SP instances to be conatinated (like an array).
     * Does not modify either instance, but returns new SP instance.
     */
    concat: function(other){
        var result = new Parser();
        this.each(function(item){
            console.log("item 1", item);
            result.push(item);
        });

        other.each(function(item){
            console.log("item 2", item);
            result.push(item);
        });

        return result;
    },


    /**
     * Function: find
     *  
     * Finds all children of the elements that match
     * the given selector.
     * 
     * Parameters:
     *  (String)     selector - (Optional) The selector to match. 
     *                          Supported selectors:
     *                          E > F (F is a direct child of E)
     *                          E, F (E or F named element)
     *                          ns|E (elements with name E in namespace ns - namespace is determined by E having an xmlns attribute - from CSS3)
     *                          * (matches all element names)
     *                          
     *                          Selectors can be combined:
     *                          "http://jabber.org/protocol/pubsub|pubsub, event > items > item"
     * 
     *
     * Returns:
     *    A Parser instance (could be empty).
     *
     */
    find: function(selector){
        var elements = [];

        // support the '>' CSS selector
        var hierarchy = [selector];

        if(selector){
            hierarchy = trimArray(selector.split(">"));
        }

        this.each(function(e){
            if(e !== undefined && e !== null){
                var nodeName = hierarchy[0];
                var ns = null;

                // support the ',' CSS OR selector
                var nodes = [nodeName];
                if(nodeName){
                    nodes = trimArray(nodeName.split(","));
                }

                for(var j = 0; j < nodes.length; j++){
                    // support namespace search
                    var node = trimArray((nodes[j] || "").split("|"));
                    if(node.length == 2){ // ns specified
                        nodeName = node[1];
                        ns = node[0];
                    } else {
                        nodeName = node[0];
                        ns = null;
                    }

                    // allow "" and "*" to mean "match any element name"
                    if(nodeName === "" || nodeName === "*"){
                        nodeName = null;
                    }
                    // allow empty ns to mean no ns specified
                    ns = ns == ""? null : ns;
                    
                    Strophe.forEachChild(e, nodeName, function (elem) {
                        if (ns == null || elem.getAttribute("xmlns") == ns ) {
                            
                            // look ahead
                            if(hierarchy[1]){
                                Parser(elem).find(hierarchy.slice(1).join(">")).each(function(elem){
                                    elements.push(elem);
                                });
                            }
                            else {
                                elements.push(elem);
                            }
                        }
                    });
                }
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
    },

    /**
     * Function: text
     *  
     * Gets the text values of all of the elements concatinated as a single string.
     * Note that this is not recursive.
     *
     * Returns:
     *    A string, empty if no text elements are found.
     */
    text: function(){
        var ret = "";

        this.each(function(elem){
            ret += (Strophe.getText(elem) || "");
        });
        
        return ret; 
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


