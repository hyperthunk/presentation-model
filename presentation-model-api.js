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

Object.isObject = function(x) {
    if (!((Object.isArray(x) || (Object.isHash(x) || Object.isFunction(x) || Object.isNumber(x))))) {
        return (typeof x == 'object');
    } else {
        return false;
    }
};

Object.isPrimative = function(x) {
    return (Object.isNumber(x) || Object.isString(x));
};

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

var ArgumentException = Class.create({
    initialize: function(msg) {
        this.message = msg;
    },
    name: "ArgumentException"
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
            var islocal = data['__x_created_locally'] || true;
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
        var self = this;
        var opts = new Hash(
            defaults(this.ajax_options('GET', false, {
                success: function(data) {
                    data['__x_created_locally'] = false;
                    result = self.create(data);
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
    PUT: function(options) {
        var result = undefined;
	var self = this;
        var opts = new Hash(
            defaults(this.ajax_options('PUT', false, {
                success: function(data) {
                    result = self.create(data);
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

var RenderStrategy = Class.create({
    initialize: function(options) {
        jQuery.extend(this, options);
        // do i need this?
        //this.initial_content = this.context;
    },
   /* verify_template: function(template_name) {
        var template = this[template_name];
        var template_exists = !Object.isUndefined(template) && Object.isFunction(template.evaluate);
        if (!template_exists) {
            this.fail_if_required(template_name);
        }
    },
    fail_if_required: function(template_name, container) {
        var requirement_checks = {
            multi_field_template:   Object.isArray,
            complex_field_template: Object.isObject
        };
        if (['container_template', 'field_template'].include(template_name)) {
            throw new IllegalOperationException(
                "RenderStrategy requires a rule or template for [#{item}].".interpolate({
                    item: template_name.gsub(/_template/, '')
                })
            );
        } else if (requirement_checks[template_name] != undefined) {
            var self = this;
            var fn = requirement_checks[template_name];
            var matched = Object.keys(self.fields).detect(
                function(field) {
                    return (fn(self.fields[field]));
                }
            );
            if (matched != undefined) {
                var message = (Object.isString(matched)) ?
                    "RenderStrategy requires a [#{item}] rule or template for attribute [#{matched}]." :
                    "RenderStrategy requires a rule or template for [#{item}].";
                throw new IllegalOperationException(
                    message.interpolate({
                        item: template_name.gsub(/_template/, ''),
                        matched: matched
                    })
                );
            }
        }
        return false;
    },*/
    gen_container_template: function(literal) {
        return {
            evaluate: function(data) {
                var jq = jQuery(literal)
                if (data.id) {
                    jq.attr('id', data.id);
                }
                return jq;
            }
        };
    },
    gen_field_template: function(literal) {
        return {
            evaluate: function(data) {
                var dom = jQuery(literal);
                dom.text(data.$field.value);
                dom.addClass(data.$field.name);
                if (['input', 'option'].include(dom[0].tagName)) {
                    dom.val(data.$field.value);
                }
                return dom;
            }
        };
    },
    gen_multi_field_template: function(literal) {
        return this.gen_recursive_template_wrapper(literal, '$items');
    },
    gen_complex_field_template: function(literal) {
        return this.gen_recursive_template_wrapper(literal, '$fields');
    },
    gen_recursive_template_wrapper: function(literal, content_variable) {
        var elem = jQuery(literal).text('#{' + content_variable + '}').wrap('<div/>');
        return new Template(elem.parent().html());
    },
    prepare_templates: function() {
        var self = this;
        ['container', 'field', 'multi_field', 'complex_field'].each(function(e) {
            var literal = self.templates[e];
            var template = e + '_template';
            if (literal) {
                var fn = self['gen_' + template];
                self[template] = fn.call(self, literal);
            } else {
                var supplied = self.templates[template];
                if ((typeof supplied != 'undefined') && !(supplied instanceof Template)) {
                    supplied = new Template(supplied);
                }
                self[template] = supplied;
            }
        });
    },
    require_template: function(name, attr) {
        template = this[name];
        if (template === undefined || typeof template.evaluate != "function") {
            var message = undefined;
            if (attr === undefined || attr == '') {
                message = "RenderStrategy requires a rule or template for [#{item}].";
            } else {
                message = "RenderStrategy requires a [#{item}] rule or template for attribute [#{attr}].";
            }
            throw new IllegalOperationException(
                message.interpolate({ item: name.gsub(/_template/, ''), attr: attr })
            );
        }
        return template;
    },
    display_fields: function(context) {
        if (context.display_fields) {
            return context.display_fields;
        }
        if (Object.isPrimative(context)) {
            return [];
        }
        return Object.keys(context).select(function(e) {
            return !Object.isFunction(e);
        });
    },
    render: function(subject) {
        if (subject != undefined) {
            this.object = subject;
        }
        if (Object.isUndefined(this.object)) {
            throw new ArgumentException('Cannot render: object is undefined.');
        }
        this.prepare_templates();
        return this.perform_rendering(this.object, this.container_template, []);
    },
    scope_name: function(scope) {
        return scope.join().gsub(/,/, '.');
    },
    perform_rendering: function(context, template, scope) {
        if (Object.isArray(context)) {
            var results = [];
            for (i = 0;i < context.length; i++) {
                results.push(this.render_object({
                    $field: {
                        name: 'index' + i,
                        value: context[i]
                    },
                    $object: this.object
                }, this.require_template('field_template', this.scope_name(scope))));
            }
            var container = jQuery('<div/>');
            jQuery(results).appendTo(container);
            return jQuery(template.evaluate({ $items: container.html(), $object: this.object }));
        }
        var containment_output = this.render_object(context, template ||
                                                    this.require_template('container_template', this.scope_name(scope)));
        var fields = null;
        var self = this;
        fields = this.display_fields(context);
        var field_templates = new Hash();
        fields.each(function(f) {
            if (Object.isPrimative(context[f])) {
                field_templates.set(f, self.require_template('field_template',
                                                             self.scope_name(new Array(scope.concat([f])))));
            }
        });
        var content = [];
        fields.inject(content, function(acc, binding) {
            var new_scope = new Array(scope.concat([binding]));
            var scope_name = self.scope_name(new_scope);
            var value = context[binding];
            if (Object.isArray(value)) {
                var items = self.perform_rendering(value,
                                                   self.require_template('multi_field_template', scope_name), new_scope);
                //TODO: this feels like a bit of a hack - some refactoring is needed to make it smell less
                field = jQuery(self.require_template('field_template').evaluate({
                    $field: {
                        name: binding, value: ''
                    },
                    $object: self.object
                }));
                items.appendTo(field);
            } else if (Object.isObject(value)) {
                field = self.perform_rendering(
                    value, self.require_template('complex_field_template', scope_name), new_scope);
            } else {
                field = self.render_object({
                    $field: {
                        name:  binding,
                        value: value
                    },
                    $object: context
                }, field_templates.get(binding));
            }
            if (!field.hasClass(binding)) {
                field.addClass(binding);
            }
            acc.push(field);
            return acc;
        });
        if (content.empty()) {
            return container
        } else {
            jQuery(content).appendTo(containment_output);
            return containment_output;
        }
    },
    render_object: function(context, template) {
        return jQuery(template.evaluate(context));
    }
});

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
        ['container', 'field'].inject(handlers, function(found, e) {
            var option = opts.get(e);
            if (!Object.isUndefined(option)) {
                found.push({
                    evaluate: function(data) {
                        if (Object.keys(data).include('container')) {
                            return jQuery(option).attr('id', data.id);
                        } else {
                            // TODO: deal with arrays
                            var dom = jQuery(option);
                            dom.text(data.field.value);
                            dom.addClass(data.field.name);  //TODO: consider merging the container also!
                            if (['input', 'option'].include(dom[0].tagName)) {
                                dom.val(data.field.value);
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
            field = jQuery(
                field_template.evaluate({
                    field: {
                        'name':   binding,
                        'value':  self[binding]
                    },
                    object: self
                })
            );
            if (!field.hasClass(binding)) {
                field.addClass(binding);
            }
            return field;
        });
        var container = jQuery(container_template.evaluate({ id: this.getId(), container: true }));
        var id = this.getId();
        if (container.attr('id') != id) {
            container.attr('id', id);
        }
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
    getTemplateInjectionProperties: function() {
        var attrs = new Hash();
        var self = this;
        // TODO: maybe caching this would be a good idea!?
        // Q: how to unify the need for caching this, with the knowledge of when the object becomes dirty ???
        Object.keys(this).each(function(attr) {
            attrs.set('object.' + attr, self[attr]);
        });
        return attrs;
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
            var field = '.' + f;
            binding = jQuery(field, self.container());
            if (binding.length > 0) {
                binding.data('fieldname', f);
                return binding;
            } else { return null; }
        }).compact().each(op);
    },
    fieldSelector: function(field) {
        return '##{id} .#{field}'.interpolate({
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
        this.serializable.each(function(e) {
            json.set(e, self[e]);
        });
        return json.toObject();
    },
    hydrate: function(json) {
        // TODO: add support for nested Resource objects - maybe an override is required?
        var data = $H(json);
        if (data.get('__x_created_locally') == undefined) {
            data.set('__x_created_locally', true);
        }
        updates = data.toObject();
        Object.extend(this, updates);
        this.serializable = data.keys().without('__x_created_locally');
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
