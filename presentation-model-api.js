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

/********************************************************************************************************
 *      Prototype extensions and utilities
 ********************************************************************************************************/

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
        var args = Array.from(arguments);
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

var IllegalOperationException = Class.create({
    initialize: function(msg) {
        this.message = msg;
    },
    name: "IllegalOperationException"
});

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

/********************************************************************************************************
 *      Eventing - TODO: what is the pattern called again!?
 ********************************************************************************************************/

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

/********************************************************************************************************
 *      HTTP/AJAX Utilities
 ********************************************************************************************************/

// TODO: use http response code to determine refresh behavior(s)

var WebFacade = Class.create2(EventSink, {
    initialize: function(uri, model) {
        this.uri = uri;
        this.model = model;
    },
    create: function(data) {
        var clazz = this.model;
        if (Object.isArray(data) == true) {
            var islocal = data_set['__x_created_locally'] || true;
            return data.collect(function(e) {
                e['__x_created_locally'] = islocal;
                return new clazz(e);
            });
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

/********************************************************************************************************
 *      UI/DOM Integration based on jQuery
 ********************************************************************************************************/

var Displayable = {
    display: function() {
        this.display_fields = Array.from(arguments);
        return this;
    },
    renderAs: function(options) {
        if (Object.isString(options)) {
            // TODO: render the fields too?
            return jQuery(options).attr('id', this.getId());
        }
        var opts = $H(options).update({ object: '<div/>' });
        var syntax = opts.get('syntax');  //undefined is ok as it is just ignored when compiling them
        var handlers = [];
        var self = this;
        ['container', 'field', 'object'].inject(handlers, function(found, e) {
            var option = opts.get(e);
            if (!Object.isUndefined(option)) {
                found.push({
                    evaluate: function(obj) {
                        var data = $H(obj);
                        if (!data.keys().include('container')) {
                            return jQuery(option).attr('id', data.get('id'));
                        } else {
                            //just assume it again!
                            var dom = jQuery(option).attr('id', "#{id}-#{name}".interpolate({
                                id:   data.get('id'),
                                name: data.get('name')
                            })).text(data.get('value'));  //TODO: consider merging the container also!
                            if (['input', 'option'].include(dom.tagName)) {
                                dom.val(data.get('value'));
                            }
                            return dom;
                        }
                    }
                });
            } else {
                option = opts.get('#{item}_template'.interpolate({ item: e }));
                if (Object.isUndefined(option)) {
                    throw new IllegalOperationException("No literal or template supplied for #{item}".interpolate({ item: e }));
                }
                found.push(Object.isString(option) ? template(option, syntax) : option);
            }
            return found;
        });
        var container_template = handlers.shift();
        var field_template = handlers.shift();
        // TODO: add support for object-template
        var innerHtml = this.display_fields.collect(function(binding) {
            // TODO: add support for nested Resource classes using object-template
            return jQuery(field_template.evaluate({
                id:         self.getId(),
                name:       binding,
                value:      self[binding],
                container:  self
            }));
        });
        var container = jQuery(container_template.evaluate({ id: this.getId(), context: this }));
        if (innerHtml.empty()) {
            return container
        } else {
            jQuery(innerHtml).appendTo(container);
            return container;
        }
    },
    renderTo: function(selector, template) {
        if (selector === undefined) {
            throw new IllegalOperationException("Cannot render a [Displayable object] without providing a selector.");
        }
        ws = jQuery(selector);
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
    container: function() {
        var selector = arguments[0];
        if (selector != undefined) {
            this.dom_container = selector;
            return this;
        }
        return jQuery(this.selector());
    },
    selector: function() {
        var id = this.getId();
        return "#{loc} ##{id}".interpolate({loc: this.dom_container || '', id: id});
    },
    update: function() {
        var self = this;
        var bindings = this.display_fields || Array.from(arguments);
        this.eachBinding(bindings, function(binding) {
            self[binding.data('fieldname')] = binding.val();
        });
    },
    refreshUI: function() {
        var self = this;
        var bindings = this.display_fields || Array.from(arguments);
        this.eachBinding(bindings, function(binding) {
            binding.val(self[binding.data('fieldname')]);
        });
    },
    eachBinding: function(bindings, op) {
        //NB: op is only applied to bindings that actually exist!
        var self = this;
        bindings.collect(function(f) {
            var field = self.fieldSelector(f);
            binding = jQuery(field, self.container());
            if (binding.length > 0) {
                binding.data('fieldname', f);
                return binding;
            } else { return null; }
        }).compact().each(op);
    },
    fieldSelector: function(field) {
        return '##{id}-#{field}'.interpolate({
            field: field,
            id:    this.getId()
        });
    },
    ui: function(attribute) {
        if (attribute != undefined) {
            return jQuery(this.fieldSelector(attribute));
        } else {
            return this.container();
        }
    }
});

/********************************************************************************************************
 *      RESTful Resource representation and utilities
 ********************************************************************************************************/

var ResourceConfigurationException = function(msg) {
    return new Error(msg);
};

var Resource = Module.create(EventSink, {
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
        // TODO: add support for nested Resource objects - maybe an override is required?
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

var create_resource = function(base_uri, attrs) {
    var clazz = Class.create2(Resource, attrs);
    clazz.service = new WebFacade(base_uri, clazz);
    return clazz;
};
