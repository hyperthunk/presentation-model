/*
Copyright (c) 2009, Tim Watson
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the author nor the names of its contributors
      may be used to endorse or promote products derived from this software
      without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// basic outline of a presentation model in javascript

Object.extend(Class, {
    create2: function() {
        var args = $A(arguments);
        var attributes = args.pop();
        var clazz = undefined;
        if (args.empty()) {
            clazz = Class.create(attributes);
        } else {
            var clazz = Class.create(args.shift(), attributes);
        }
        clazz.mixin = function() {
            // call Object.extend(this, module) for each module in arguments
            var clazz = this;
            $A(arguments).each(function(module) { clazz.addMethods(module); });
            return clazz;
        };
        if (!args.empty()) {
            clazz.mixin.apply(clazz, args);
        }
        return clazz;
    }
});

Object.extend(Array.prototype, {
    empty: function() { return this.size() == 0; }
});

Object.extend(String.prototype, {
    urltrim: function() {
        return this.split('/')
                  .collect(function(e){ return (e == '') ? undefined : e})
                  .compact()
                  .join('/');
    },
    urljoin: function(other) {
        return this.urltrim() + '/' + other.urltrim();
    },
    toDjangoUrlFormat: function() {
        return this.endsWith('/') ? this : this + '/';
    }
});

var Module = {
    create: function() {
        var args = $A(arguments);
        if (Object.isHash(args.first())) {
            return args.first();
        } else {
            var module = args.pop();
            var ancestors = args;
            ancestors.each(function(e) { Object.extend(module, e); });
            return module;
        }
    }
};

var defaults = function(options, defaults) {
    return jQuery.extend(defaults, options || {});
};

var default_value = function(input, default_val) {
    return (Object.isUndefined(input)) ? default_val: input;
};

var tags_syntax = /(^|.|\r|\n)(\<%=\s*(\w+)\s*%\>)/; //matches symbols like '<%= field %>'
var template = function(html, syntax) {
    if (syntax === undefined) {
        return new Template(html);
    }
    return new Template(html, syntax);
};

var running_on_old_browser = function() { return false; };

var Subscriber = Class.create2({
    initialize: function(name, callback) {
        this.name = name;
        this.callback = callback;
    },
    receive: function(tag, data, context) {
        this.callback.apply(context, tag, data);
    }
});

var EventSink = {
    getSubscribers: function() {
        if (Object.isArray(this.subscribers) == false) {
            this.subscribers = new Array();
        }
        return this.subscribers;
    },
    register: function(tag, handler) {
        var subscriber = new Subscriber(tag, handler);
        this.getSubscribers().push(subscriber);
        return subscriber;
    },
    unregister: function(tag, subscription) {
        this.subscribers = subscribers.without(subscription);
        return this;
    },
    publish: function(tag, data, context) {
        // this is NOT a synchronized operation... :(
        this.getSubscribers()
            .select(function(e) { return e.name == tag; })
            .invoke('receive', tag, data, context || this);
        return this;
    }
};

// TODO: use http response code to determine refresh behavior(s)

var HttpService = Class.create2(EventSink, {
    initialize: function(uri, model) {
        this.uri = uri;
        this.model = model;
    },
    create: function(data) {
        var clazz = this.model;
        if (Object.isArray(data) == true) {
            return data.collect(function(e) { return new clazz(e); });
        }
        if (Object.isHash(data) == true) {
            return new clazz(data);
        }
        return data;
    },
    GET: function(options) {
        var result = undefined;
        var opts = new Hash(
            defaults(this.ajax_options('GET', false, {
                success: function(data) {
                    data['__x_created_locally'] = false;
                    result = this.create(data);
                }
            }), default_value(options, {}))
        );
        this.set_path(opts);
        var xhr = jQuery.ajax(opts);
        if (opts.async == true) {
            return xhr;
        }
        return result;
    },
    PUT: function(options) {
        var result = undefined;
        var opts = new Hash(
            defaults(this.ajax_options('PUT', false, {
                success: function(data) {
                    result = this.create(data);
                }
            }), default_value(options, {}))
        );
        this.set_path(opts);
        var xhr = jQuery.ajax(opts.toObject());
        if (opts.async == true) {
            return xhr;
        }
        return result;
    },
    set_path: function(opts) {
        var path = opts.get('path');
        if (path != undefined) {
            base_uri = opts.unset('url');
            opts.set('url', base_uri.urljoin(path).toDjangoUrlFormat());
            opts.unset('path');
        }
    },
    ajax_options: function(method, async, handlers) {
        var opts = jQuery.extend({
            url:        this.uri,
            type:       default_value(method, 'GET'),
            async:      default_value(async,  false),
            dataType:   'json'
        }, default_value(handlers, {}));

        if (running_on_old_browser() == true) {
            if (['PUT', 'DELETE'].include(method)) {
                opts['beforeSend'] = function(xhr) {
                    xhr.setRequestHeader('x-http-method-override', method);
                };
                opts['type'] = 'POST';
            }
        }
        return opts;
    }
});

var IllegalOperationException = Class.create({
    initialize: function(msg) {
        this.message = msg;
    },
    name: "IllegalOperationException"
});

var Displayable = {
    renderTo: function(selector, template) {
        if (selector === undefined) {
            throw new IllegalOperationException("Cannot render a [Displayable object] without providing a selector.");
        }
        ws = jQuery(selector);
        var interpolator = function(fn) { return function() { fn.apply(template, [this]); } };
        var html =
            (template == undefined)
                ? this.toHTML()
                : (Object.isString(template))
                    ? template.interpolate(this)
                    : template.evaluate(this);
        dom = jQuery(html);
        ws.html(dom);
        return dom;
    },
    renderAs: function(as) {
        return jQuery(as).attr('id', this.getId());
    },
    toHTML: function() {
        return this.template.evaluate(this);
    },
    getId: function() {
        if (this.id) {
            return (Object.isFunction(this.id)) ? this.id() : this.id;
        } else {
            return jQuery(this.toHTML()).attr('id');
        }
    }
};

var Bindable = Module.create(Displayable, {
    bindTo: function(selector) { this.binding = selector; return this; },
    display: function() {
        this.bindings = $A(arguments || []);
    },
    render: function(template) {
        return this.renderTo(this.binding, template);
    },
    ui: function() {
        return jQuery(this.selector());
    },
    selector: function() {
        var id = this.getId();
        return "#{loc} ##{id}".interpolate({loc: this.binding || '', id: id});
    },
    update: function() {
        var self = this;
        var bindings = this.bindings || $A(arguments);
        bindings.each(function(f) {
            binding = jQuery('##{id}-#{field}'.interpolate({
                field: f, id:
                self.getId()
            }), self.selector());
            self[f] = binding.val();
        });
    }
});

var ResourceConfigurationException = function(msg) {
    return new Error(msg);
};

var Resource = Module.create(Bindable, EventSink, {
    initialize: function(json) {
        this.hydrate(json);
    },
    id: function() {
        return this.pk;
    },
    toJSON: function() {
        var json = new Hash();
        var self = this;
        if (this.inline_fields.size() > 0) {
            var fields = new Hash();
            this.inline_fields.each(function(f) { fields.set(f, self[f]); });
            json.set('fields', fields.toObject());
        }
        this.serializable.reject(function(s) {
            return self.inline_fields.member(s);
        } ).each(function(e) {
            json.set(e, self[e]);
        });
        return json.toObject();
    },
    hydrate: function(json) {
        var data = $H().merge(json);
        if (data.get('__x_created_locally') == undefined) {
            data.set('__x_created_locally', true);
        }
        fields = data.unset('fields');
        data.update(fields || {});
        updates = data.toObject();
        Object.extend(this, updates);
        this.serializable = data.keys().without('__x_created_locally');
        this.inline_fields = Object.keys(fields);
        return this;
    },
    pull: function() {
        var path_ext = this.id();
        this.ajax_service().GET({
            path: path_ext,
            success: this.hydrate
        });
        return this;
    },
    push: function() {
        var service = this.ajax_service();
        var method = (this.__x_created_locally == true) ? service.PUT : service.POST;
        method.apply(service, [{ path: this.id(), data: this.toJSON() }]);
        return this;
    },
    ajax_service: function() {
        if (this.constructor.service === undefined) {
            throw ResourceConfigurationException("No service has been configured for this resource class");
        }
        return this.constructor.service;
    }
});

var ResourceLoader = Class.create2(EventSink, {
    load: function(resourceClass) {
        this.publish('beforeLoad', resourceClass);
        data_set = resourceClass.service.GET();
        // TODO: finish this off, passing the deserialized objects to an event handler.
        // TODO: return the data_set or this - decide which.
    }
});

var create_resource = function(base_uri, attrs) {
    var clazz = Class.create2(Resource, attrs);
    clazz.service = new HttpService(base_uri, clazz);
    return clazz;
};

/*

// create DistributionList representation
var DistributionList = Class.create(Resource, {
    initialize: function(json) {
        //NB: for some reason, Prototype's $super syntax isn't working here!?
        Resource.initialize.apply(this, [json]);
        this.template =
            template("<div id='<%= pk %>'><%= name %></div>");
    }
});

// give DistributionList an http service
DistributionList.service = new HttpService('/mailinglist', DistributionList);

// make MailingList into a displayable object
mixin(DistributionList, Bindable);

*/
