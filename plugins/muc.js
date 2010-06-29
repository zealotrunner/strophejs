/*
  Copyright 2010, Drakontas LLC
  Ilya Braude ilya@drakontas.com
*/

Strophe.addConnectionPlugin('muc', {
    /*
     Extend connection object to have plugin name 'muc'.
    */
    _conn: null,

    //The plugin must have the init function.
    init: function(conn) {

        this._conn = conn;

        /*
          Function used to setup plugin.
        */
        
        /* extend name space 
         *  NS.MUC - XMPP MUC NS
         *  NS.MUC_USER - XMPP MUC User NS
         *
         */
        Strophe.addNamespace('MUC',"http://jabber.org/protocol/muc");        
        Strophe.addNamespace('MUC_USER', Strophe.NS.MUC + "#user");
    },


    /** Function: joinRoom
     *     
     * Join a MUC room on a service.
     * 
     * Parameters:
     *   (String) service - The name of the muc service.
     *   (String) room -  The name of the muc room.
     *   (String) nick -  The nick to use.
     *   (Dictionary) history -  (Optional) A history request dict. e.g.: {history: 10}.
     *   (Function) callback - (Optional) Called when the response arrives. 
     *          No special processing on the response is performed.
     * 
     * Returns:
     *   Iq id used to send the join request.
     */
    joinRoom : function(service, room, nick, callback, history){
        var presId = this._conn.getUniqueId("joinRoom");
        
        var pres = $pres({to: room + '@' + service + '/' + nick, id:presId});

        if( history ){        
            pres.c('x', {xmlns: Strophe.NS.MUC})
                .c('history', history);
        }

        if( callback ){
            this._conn.addHandler(callback, null, 'presence', null, 
                                  presId, null);
        }
        this._conn.send(pres.tree());
        return presId;        
    },

    /** Function: leaveRoom
     *     
     * Leave a MUC room on a service.
     * 
     * Parameters:
     *   (String) service - The name of the muc service.
     *   (String) room -  The name of the muc room.
     *   (String) nick -  The nick that was used.
     *   (String) status -  (Optional) A status to set when leaving.
     *   (Function) callback - (Optional) Called when the response arrives. 
     *          No special processing on the response is performed.
     * 
     * Returns:
     *   Iq id used to send the leave request.
     */
    leaveRoom : function(service, room, nick, status, callback){
        var presId = this._conn.getUniqueId("leaveRoom");
        
        var pres = $pres({to: room + '@' + service + '/' + nick, id:presId, 
                          type: 'unavailable'});
        if(status){
            pres.c('status', status);
        }

        if( callback ){
            this._conn.addHandler(callback, null, 'presence', null, 
                                  presId, null);
        }

        this._conn.send(pres.tree());
        return presId;
    },

    /** Function: discoverRooms
     *     
     * Discovers available rooms on the service.  Requires the disco plugin.
     * 
     * Parameters:
     *   (String) service - The name of the muc service.
     *   (Function) callback - (Optional) Called when the disco response arrives. 
     *          See disco plugin docs.
     * 
     * Returns:
     *   Iq id used to send the leave request.
     */
    discoverRooms : function(service, callback){        
        return this._conn.disco.discoverItems(service, null, callback);
    },


    /** Function: cancelHandler
     * 
     * Cancels a previously registered handler
     * 
     * Parameters:
     *   (Handler) handler - the handler to cancel
     */
    cancelHandler: function(handler){
        this._conn.deleteHandler(handler);
    },


    /** Function: registerHandlers
     *
     * Utility method to register multiple handlers for MUC events.
     *
     * Callbacks are:
     *  presence(pres):
     *     Registeres a notifier for MUC presences for the specified room/service.
     *     The callback gets the presence message.
     *       .hasStatus(status_code) - returns true if the status number is in the presence
     *       .getAffiliation() - returns affiliation
     *       .getJid() - returns jid
     *       .getRole() - returns role
     *       .getNick() - returns nick
     *  roommessage(message):
     *     Registeres a message notifier for the room/service
     *     param to callback has the message as well as:
     *       .getDelayTime() - gets delay timestamp
     *       .getFromNick() - gets the nick of the sender
     *  privatemessage(message):
     *     Registeres a message notifier for the PMs for the room/service
     *     param to callback has the message as well as:
     *       .getFromNick() - gets the nick of the sender
     *  nickchanged(oldnick, newnick):
     *     Fired when nick is changing
     *  joined(pres):
     *     Fired when a user joined
     *  left(pres):
     *     Fired when a user left
     *
     * TODO: (as soon as I figure out a good API for this functionality):
     *  In addition to the callbacks, mixins can be specified with similar names
     *  to the callbacks.  I.e.: callback: 'presence', mixins: 'presence_mixins'.
     */
    registerHandlers: function(service, room_name, callbacks){
        callbacks = callbacks || {};
        var ret = {};

        var muc = this;

        if(callbacks.presence){
            var callback_wrapper = function(pres){
                Strophe.Mixin.apply(pres, muc.mixins.Presence);
                callbacks.presence(pres);
                
                return true; // keep handler registered
            }
            
            ret.presence = this._conn.addHandler(callback_wrapper, 
                                                 Strophe.NS.MUC_USER, 
                                                 "presence", null, null, 
                                                 room_name + "@" + service, {
                                                     matchBare: true
                                                 });
        }

        if(callbacks.nickchanged){
            ret.nickchanged = this.registerHandlers(service, room_name, {
                presence: function(pres){
                    if(pres.getType() == "unavailable"){
                        var is303 = pres.hasStatus(303);
                        if( is303 ){
                            var newnick = pres.getNick();
                            var oldnick = Strophe.getResourceFromJid(pres.getFrom());
                            callbacks.nickchanged(oldnick, newnick);
                        }
                    }
                }
            }).presence;
        }

        if(callbacks.joined){
            ret.joined = this.registerHandlers(service, room_name, {
                presence: function(pres){
                    if(pres.getType() != "unavailable"){
                        var isMine = pres.hasStatus(110);
                        if( !isMine ){
                            callbacks.joined(pres);
                        }
                    }
                }
            }).presence;
        }

        if(callbacks.left){
            ret.left = this.registerHandlers(service, room_name, {
                presence: function(pres){
                    if(pres.getType() == "unavailable"){
                        var isMine = pres.hasStatus(110);
                        if( !isMine ){
                            callbacks.left(pres);
                        }
                    }
                }
            }).presence;
        }


        if(callbacks.roommessage){
            var callback_wrapper = function(message){
                Strophe.Mixin.apply(message, muc.mixins.GroupMessage);
                
                callbacks.roommessage(message);
                
                return true; // keep handler alive
            }
            
            ret.roommessage = this._conn.addHandler(callback_wrapper, null, 
                                                    "message", "groupchat",
                                                    null, 
                                                    room_name + "@" + service,
                                                    {matchBare: true});
        }

        if(callbacks.privatemessage){
            var callback_wrapper = function(message){
                Strophe.Mixin.apply(message, muc.mixins.PrivateMessage);
                callbacks.privatemessage(message);
                
                return true; // keep handler alive
            }
            
            ret.privatemessage = this._conn.addHandler(callback_wrapper, null, 
                                                       "message", "chat",
                                                       null, 
                                                       room_name + "@" + service,
                                                       {matchBare: true});
        }


        return ret;
    },

    mixins: {
        Presence: Strophe.Mixin.apply({
            hasStatus: function(status_code){
                status_code = status_code + "";
                var x = pres.getExtentionsByNS(Strophe.NS.MUC_USER)[0];
                if(x){
                    var statuses = x.getElementsByTagName("status");
                    for(var i = 0; i < statuses.length; i++){
                        if(statuses[i].getAttribute("code") == status_code){
                            return true;
                        }
                    }
                }
                
                return false;
            },
            getAffiliation: function(){
                var x = pres.getExtentionsByNS(Strophe.NS.MUC_USER)[0];
                var item = x && x.getElementsByTagName("item")[0];
                if(item){
                    return item.getAttribute("affiliation");
                } else {
                    return null;
                }
            },
            getJid: function(){
                var x = pres.getExtentionsByNS(Strophe.NS.MUC_USER)[0];
                var item = x && x.getElementsByTagName("item")[0];
                if(item){
                    return item.getAttribute("jid");
                } else {
                    return null;
                }
            },
            getRole: function(){
                var x = pres.getExtentionsByNS(Strophe.NS.MUC_USER)[0];
                var item = x && x.getElementsByTagName("item")[0];
                if(item){
                    return item.getAttribute("role");
                } else {
                    return null;
                }
            },
            getNick: function(){
                var x = pres.getExtentionsByNS(Strophe.NS.MUC_USER)[0];
                var item = x.getElementsByTagName("item")[0];
                if(item){
                    return item.getAttribute("nick");
                } else {
                    return null;
                }
            }
        }, Strophe.Mixin.Presence),

        
        GroupMessage: Strophe.Mixin.apply({
            getDelayTime: function(){
                var delay = this.getElementsByTagNameNS("delay");
                if(delay.length > 0){
                    delay = delay[0];
                    return delay.getAttribute("stamp");
                }
                return null;
            },
            getFromNick: function(){
                return Strophe.getResourceFromJid(this.getFrom());
            }
        }, Strophe.Mixin.Message),


        PrivateMessage: Strophe.Mixin.apply({
            getFromNick: function(){
                return Strophe.getResourceFromJid(this.getFrom());
            }
        }, Strophe.Mixin.Message)
    }
});
