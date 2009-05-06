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

/********************************************************************************************************
 *      jQuery/Prototype Rest API Test Fixtures
 ********************************************************************************************************/

var temp = function ($) {
    with (jqUnit) {

        /********************************************************************************************************
         *      Custom test case classes/modules/data
         ********************************************************************************************************/

        var TestResource = Class.create2(Resource, Bindable, {});
        TestResource.service = { GET: Prototype.emptyFunction };

        //mixin(TestResource, EventSink);

        /********************************************************************************************************
         *      Displayable (UI/DOM management) Unit Tests
         ********************************************************************************************************/

        module('Displayable Tests');
        test('location should use the id() function and dom binding', function(){
            var subject = new TestResource({pk: 'id123'});
            subject.container('#div123');
            equals(subject.selector(), '#div123 #id123');
        });

        test('view function should return wrapped set from location', function() {
            expected = $('#sandbox #data');
            equals(new TestResource({
                id:         function() { return 'data'; }
            }).container('#sandbox').container().html(), expected.html());
        });

        test("toHTML function should call evaluate on the object's template", function() {
            var htmlTemplate = new Template("this text is ignored - this is a mock");
            var mockEvaluate = new jqMock.Mock(htmlTemplate, 'evaluate');
            var subject = new TestResource({template: htmlTemplate});
            mockEvaluate.modify().args(subject).multiplicity(1);
            subject.toHTML();
            mockEvaluate.verify();
            mockEvaluate.restore(); //don't think this is required, but just in case...
        });

        test("renderTo function should put the result of this.toHTML into the target dom location", function() {
            var selector = '#testBinding2';
            var expectedHTML = '<p>Hello World</p>';
            var subject = new TestResource({
                toHTML:     function() { return expectedHTML; }
            });
            subject.renderTo(selector);
            equals($(selector).html(), expectedHTML);
        });

        test("renderTo function should call the supplied template if present", function() {
            var selector = '#testBinding3';
            var template = '<div>#{name}</div>';
            var subject = new TestResource({ name: 'Johnny Cash' });
            subject.renderTo(selector, template);
            equals($(selector).html(), '<div>Johnny Cash</div>');
        });

        test("renderTo function should return a wrapped set of the new content", function() {
            var selector = '#testBinding4';
            var id = 'objectid';
            var template = "<input id='#{oid}' type='text'>#{name}</div>";
            var subject = new TestResource({ oid: id, name: 'Johnny Cash' });
            subject.renderTo(selector, template).click(function(e) {
                subject.name = $(this).val();
            });

            var update = "Tim Jones";
            $("#" + id).val(update).trigger('click');
            equals(subject.name, update, "resetting object property based on event handler returned from renderTo");
        });

        test("renderTo function should puke if unbound and passed undefined as selector", function() {
            var subject = new TestResource();
            jqMock.expectThatExceptionThrown(function() { subject.renderTo(); },
                is.exception({
                    message: "Cannot render a [Displayable object] without providing a selector.",
                    type: IllegalOperationException
                })
            );
        });

        test('renderAs function should default to an empty element with the id set correctly', function() {
            var id = '1928374';
            var subject = new TestResource({ pk: id });

            var content = subject.renderAs('<div/>').appendTo('#target1');
            equals(jQuery('#target1').html(), '<div id="1928374"></div>');
        });

        test('renderAs function should create container and fields using default templates when literals are given', function() {
            var id = '12345';
            var name = "DWORD Smith";
            var age = 'Old as the hills';
            var subject = new TestResource({ id: id, name: name, age: age });

            var content = subject
                .display('name', 'age')
                .renderAs({
                    templates: {
                        container: '<ul/>',
                        field:     '<li/>'
                    }
                }).appendTo('#target2');
            equals(jQuery('#target2').html(),
                '<ul id="12345"><li class="name">DWORD Smith</li><li class="age">Old as the hills</li></ul>');
        });

        test('renderAs function should render templates for both container and fields', function() {
            var id = '12345';
            var name = "DWORD Smith";
            var age = 'Old as the hills';
            var subject = new TestResource({ id: id, name: name, age: age });

            var content = subject
                .display('name', 'age')
                .renderAs({
                    templates: {
                        container_template: '<ul id="#{$object.id}"></ul>',
                        field_template:     '<li parent="#{$object.id}">#{$field.value}</li>'
                    }
                }).appendTo('#target3');
            equals(jQuery('#target3').html(),
                '<ul id="12345"><li class="name" parent="12345">DWORD Smith</li><li class="age" parent="12345">Old as the hills</li></ul>');
        });

        test("renderAs function should return a wrapped set of the new content", function() {
            var selector = '#testBinding5';
            var id = 'bob';
            var subject = new TestResource({ id: id, uri: 'foo', name: 'Bob Dillan' });
            subject.display('name').renderAs({
                templates: {
                    container_template: '<form id="#{$object.id}" method="POST" action="#{$object.uri}></form>',
                    field:              '<input/>'
                }
            }).appendTo(selector).bind('changed', function(e) {
                subject.name = $(e.target).val();
                return false;
            });

            var update = "Aerosmith";
            $("#bob .name").val(update).trigger('changed');
            equals(subject.name, update, "resetting object property based on event handler returned from renderTo");
        });

        /********************************************************************************************************
         *      RenderStrategy Unit Tests
         ********************************************************************************************************/

        module('RenderStrategy Tests');
        test('it should puke if you try to render without specifying an object', function() {
            jqMock.expectThatExceptionThrown(function() {
                    new RenderStrategy({}).render();
                },
                is.exception({
                    message: "Cannot render: object is undefined.",
                    type: ArgumentException
                })
            );
        });

        test('it should puke if you try to initialize with no container rule', function() {
            jqMock.expectThatExceptionThrown(function() {
                    new RenderStrategy({
                        object:     { name: 'name' },
                        templates:  {}
                    }).render();
                },
                is.exception({
                    message: "RenderStrategy requires a rule or template for [container].",
                    type: IllegalOperationException
                })
            );
        });

	test('it should puke if you try to render arrays with no multi_field rule', function() {
	    var contacts = [ 'foo.bar@gmail.com', 'a.b@c.com' ];
            jqMock.expectThatExceptionThrown(function() {
                    new RenderStrategy({
                        object:     { contacts: contacts },
                        templates:  {
                            container:  '<div/>',
                            field:      '<div/>'
                        }
                    }).render();
                },
                is.exception({
                    message: "RenderStrategy requires a [multi_field] rule or template for attribute [contacts].",
                    type: IllegalOperationException
                })
            );
	});

        test('it should puke if you try to render objects with no complex_field rule', function() {
            var contacts = [ 'foo.bar@gmail.com', 'a.b@c.com' ];
            jqMock.expectThatExceptionThrown(function() {
                    new RenderStrategy({
                        object:     {
                            name: 't4',
                            complex: {
                                id: '192384777',
                                contacts: contacts
                            }
                        },
                        templates:  { container: '<div/>', field: '<div/>', multi_field: '<div/>' }
                    }).render();
                },
                is.exception({
                    message: "RenderStrategy requires a [complex_field] rule or template for attribute [complex].",
                    type: IllegalOperationException
                })
            );
        });

        test('it should puke if you try to render objects containing arrays with no multi_field rule', function() {
            var contacts = [ 'foo.bar@gmail.com', 'a.b@c.com' ];
            jqMock.expectThatExceptionThrown(function() {
                    new RenderStrategy({
                        object: {
                            name: 't4',
                            complex: {
                                id:       '192384777',
                                contacts: contacts
                            }
                        },
                        templates:  { container: '<div/>', field: '<div/>', complex_field: '<div/>' }
                    }).render();
                },
                is.exception({
                    message: "RenderStrategy requires a [multi_field] rule or template for attribute [complex.contacts].",
                    type: IllegalOperationException
                })
            );
        });

        test('render should inject each item as a field when a containing field is an array', function() {
            var id = 'x909';
            var name = "Foo Bar";
            var age = '999';
            var subject = {
                id: id,
                name: name,
                contacts: [ 'foo.bar@gmail.com', 'a.b@c.com' ],
                display_fields: [ 'name', 'contacts' ]
            };
            var contacts = subject.contacts;

            var strategy = new RenderStrategy({
                object: subject,
                templates: {
                    container:              '<ul/>',
                    field:                  '<li/>',
                    multi_field_template:   '<li><div><ul>#{$items}</ul></div></li>'
                }
            });
            var content = strategy.render().appendTo('#targetX');
            equals($('#targetX').html(),
                '<ul id="x909">' +
                    '<li class="name">Foo Bar</li>' +
                    '<li class="contacts">'         +
                        '<div>'                     +
                            '<ul>'                  +
                                '<li class="index0">foo.bar@gmail.com</li>'    +
                                '<li class="index1">a.b@c.com</li>'            +
                            '</ul>'                 +
                        '</div>'                    +
                    '</li>'                         +
                '</ul>');
            equals($('#x909 .contacts .index0').text(), 'foo.bar@gmail.com');
            equals($('#x909 .contacts .index1').text(), 'a.b@c.com');
        });

        test('render should apply base templates to nested json objects', function() {
            var subject = new TestResource({
                id: 9616143,
                name: 'Thor',
                contract: {
                    type: 'dubious',
                    rating: '85%',
                    tags: [ 'utility', 'power user' ]
                }
            }).display('name', 'contract');
            var strategy = new RenderStrategy({
                inline_array_fields: true,
                templates: {
                    container:      '<div/>',
                    field_template: '<div>Contract #{$field.name}: #{$field.value}</div>',
                    complex_field:  '<div/>'
                }
            });
            var content = strategy.render(subject).appendTo('#targetY');
            var expected_html =
                '<div id="9616143">' +
                    '<div class="name">Contract name: Thor</div>'  +
                    '<div class="contract">' +
                        '<div class="type">Contract type: dubious</div>' +
                        '<div class="rating">Contract rating: 85%</div>' +
                        '<div class="tags">Contract tags: utility,power user</div>' +
                    '</div>' +
                "</div>";
            equals($('#targetY').html(), expected_html);
            ok(subject.bindings().contract.type.ui().text().match(/dubious/), 'Contract type rendered correctly');
            ok(subject.bindings().contract.rating.ui().text().match(/85%/), 'Contract rating rendered correctly');
            ok(subject.bindings().contract.tags.ui().text().match(/utility,power user/), 'Contract tags rendered correctly');
        });

        test('render should inject each component field using the correct template when generating complex field template output',
             function() {
            var subject = new TestResource({
                id: function() { return 19236475; },
                name: 'Freya',
                age:  'Immortal',
                widgets: {
                    rss_feed: {
                        uri: 'http://presentation-model/feeds/howcoolisthis.atom',
                        name: 'cool-presentation-model'
                    },
                    blog_roll: {
                        hyperthunk: 'http://hyperthunk.wordpress.com',
                        rants: 'http://rants.ekanem.de',
                        kerry: 'http://www.kerrybuckley.org'
                    }
                }
            });
            var strategy = new RenderStrategy({
                inline_array_fields: true,
                templates: {
                    container: '<div/>',
                    // this complex field template is the same as the literal equivalent '<div/>'
                    complex_field_template: '<div>#{$fields}</div>',
                    field_template: {
                        anchor:   new Template('<div><a href="#{$field.value}">#{$field.name}</a></div>'),
                        standard: new Template('<div>#{$field.value}</div>'),
                        evaluate: function(data) {
                            if (data.$field.value.match(/http:/)) {
                                return this.anchor.evaluate(data);
                            }
                            return this.standard.evaluate(data);
                        }
                    }
                }
            });
            var content = subject.renderAs(strategy).appendTo('#targetZ');
            var expected_html =
                '<div id="19236475">' +
                    '<div class="name">Freya</div>'  +
                    '<div class="age">Immortal</div>'  +
                    '<div class="widgets">' +
                        '<div class="rss_feed">' +
                            '<div class="uri">' +
                                '<a href="http://presentation-model/feeds/howcoolisthis.atom">uri</a>' +
                            '</div>' +
                            '<div class="name">cool-presentation-model</div>' +
                        '</div>' +
                        '<div class="blog_roll">' +
                            '<div class="hyperthunk"><a href="http://hyperthunk.wordpress.com">hyperthunk</a></div>' +
                            '<div class="rants"><a href="http://rants.ekanem.de">rants</a></div>' +
                            '<div class="kerry"><a href="http://www.kerrybuckley.org">kerry</a></div>' +
                        '</div>' +
                    '</div>' +
                "</div>";
            equals($('#targetZ').html(), expected_html);
        });

        /********************************************************************************************************
         *      Bindable Unit Tests
         ********************************************************************************************************/
        module('Bindable Tests');
        test('binding context should support attributes for each field', function() {
            var subject = new TestResource({ id: 'id', name: 'foo', occupation: 'bar' });
            var bindings = new BindingContext(subject);
            equals(bindings.name.selector, '#id > .name');
            equals(bindings.occupation.selector, '#id > .occupation');
            equals(bindings.name.container, bindings);
            equals(bindings.occupation.container, bindings);
        });

        test('binding context should create a structure representing that of the contained object', function() {
            var subject = new TestResource({
                id:   'id',
                name: 'name',
                complex: {
                    name: 'name',
                    age:  21,
                    links: {
                        one: 'http://link.one.com',
                        two: 'http://link.two.com'
                    }
                }
            });
            var bindings = new BindingContext(subject);
            equals(bindings.complex.name.selector, '#id > .complex > .name');
            equals(bindings.complex.links.two.selector, '#id > .complex > .links > .two');
        });

        test('binding context should return jQuery object given the correct selector', function() {
            var mockJQ = new jqMock.Mock(window, 'jQuery');
            var expected_selector = '#id > .transport';
            try {
                mockJQ.modify().args(expected_selector).multiplicity(1);
                var subject = new TestResource({ id: 'id', transport: 'air' });
                var bindings = new BindingContext(subject);
                ok(bindings.transport.ui().jquery != undefined);
                mockJQ.verify();
            } finally {
                mockJQ.restore();
            }
        });

        test('binding context should return its bound children on demand', function() {
            var subject = new TestResource({
                id:   'excluded',
                name: 'foobar',
                groups: {
                    name: 'name',
                    age:  21
                }
            }).display('name', 'groups');
            var bindings = new BindingContext(subject);
            equals(bindings.children().size(), 2);
        });

        test("binding context should use jQuery object to its context's fields", function() {
            var retval = jQuery.extend([{ tagName: 'option' }], { val: function() { return 'water'; } });
            var mockJQ = new jqMock.Mock(window, 'jQuery');
            try {
                mockJQ.modify()
                    .args(is.anything)
                    .returnValue(retval);
                var subject = new TestResource({ id: 'id', transport: 'air' }).display('transport');
                var bindings = new BindingContext(subject);

                bindings.transport.update();
                equals(subject.transport, 'water');
                mockJQ.verify();
            } finally {
                mockJQ.restore();
            }
        });

        test("binding context should update children if there are any", function() {
            var retval = jQuery.extend([{ tagName: 'input' }], { val: function() { return 'bar'; } });
            var mockJQ = new jqMock.Mock(window, 'jQuery');
            try {
                mockJQ.modify()
                    .args('#id > .complex > .name')
                    .returnValue(retval);
                var subject = new TestResource({
                    id: 'id',
                    complex: {
                        name: 'foo'
                    }
                }).display('complex');
                var bindings = new BindingContext(subject);

                bindings.complex.update();
                equals(subject.complex.name, 'bar');
                mockJQ.verify();
            } finally {
                mockJQ.restore();
            }
        });

        test('binding context should use jQuery.val() for options and text for other elements', function() {
            var updated = { val: function() { return 'updated'; } };
            var input = jQuery.extend([{ tagName: 'input' }], updated);
            var option = jQuery.extend([{ tagName: 'option' }], updated);
            var div = jQuery.extend([{ tagName: 'DIV' }], { text: function(){ return 'updated'; } });
            var mockJQ = new jqMock.Mock(window, 'jQuery');
            try {
                mockJQ.modify().args('#id > .name').returnValue(div);
                mockJQ.modify().args('#id > .options > .speed').returnValue(input);
                mockJQ.modify().args('#id > .options > .strength').returnValue(option);

                var subject = new TestResource({
                    id: 'id',
                    name: 'character1',
                    options: {
                        speed:    92,
                        strength: 50
                    }
                }).display('name', 'options');
                var bindings = new BindingContext(subject);

                bindings.update();
                equals(subject.name, 'updated');
                equals(subject.options.speed, 'updated');
                equals(subject.options.strength, 'updated');
                mockJQ.verify();
            } finally {
                mockJQ.restore();
            }
        });

        test('binding context should refresh the ui with the current context value', function() {
            var subject = new TestResource({ id: 'foo', name: 'Anton' });
            var bindings = subject.bindings();

            subject.display('name').renderAs({ templates: {
                container:  '<div/>',
                field:      '<div/>'
            }}).appendTo(jQuery('#binding-container'));

            subject.name = 'freddy';
            bindings.refresh();
            equals(bindings.name.ui().text(), 'freddy');
        });

        test('bindings should return the binding context', function() {
            jqMock.assertThat(new TestResource().bindings(), is.instanceOf(BindingContext));
        });

        test('update function should pull new values from inputs based on attributes', function() {
            var form_template =
                new Template(
                "<div id='#{id}'>" +
                    "<input type='text' class='name' value='#{name}' />" +
                    "<input type='text' class='age' value='#{age}'/>" +
                    "<button type='submit' id='submit-button'>Click me - go on, I dare you!</button>" +
                "</div>");
            var id = 'objectid234';
            var name = "Bing Crosby";
            var age = 'Deceased';
            var subject = new TestResource({ id: id, name: name, age: age });

            var content = subject
                .display('name', 'age')
                .renderTo('#test-form', form_template)
                .addClass('someCSS');

            jQuery('#submit-button', content)
                .one('click', function() {
                    subject.bindings().update();
                    return false;
                });

            var joe = "Joe Bloggs";
            var reincarnated = 'Reincarnated';

            $('#objectid234 .name').val(joe);
            $('#objectid234 .age').val(reincarnated);

            $('#submit-button').trigger('click');
            equals(subject.name, joe, "subject name reset to 'Joe Bloggs'");
            equals(subject.age, reincarnated, "subject age reset to 'Reincarnated'");
            ok(content.hasClass('someCSS'));  //sanity check - just to make me believe that the wrapped set was returned
        });

        test('update should silently ignore you if no binding was specified', function() {
            var subject = new TestResource({ pk: 'xyz', name: 'foobar' });
            subject.bindings().update('name');  //if this really happend, the call to binding.val() would place '' or undefined in the name attribute
            equals(subject.name, 'foobar');
        });

        test('refresh should silently ignore you if no binding was specified', function() {
            var subject = new TestResource({ id: 'foobar' });
            subject.refresh();
        });

        test('refresh should update bound dom elements when a binding has taken place', function() {
            var subject = new TestResource({ id: 'subject197', name: 'Joe the Man', handle: 'jdm' });
            subject.container('#test-container1');
            subject.display('name', 'handle')
                   .renderAs({ templates: { container: '<div/>', field: '<input/>' } })
                   .appendTo('#test-container1');

            subject.name = 'Darth Vader';
            subject.handle = 'ManNamedSue';

            subject.refresh();
            equals(subject.bindings().name.ui().val(), subject.name);
            equals(subject.bindings().handle.ui().val(), subject.handle);
        });

        test('update should support arbitrarilly complex object graphs', function() {
            // TODO: test this.....
            var subject = new TestResource({
                id: 16277739,
                name: 'foobar',
                complex1: {
                    name: 'nest level 1',
                    to_change: 'hello world',
                    complex2: {
                        name: 'nest level 2',
                        to_change: 'hello javascript',
                        complex3: {
                            name: 'nest level 3',
                            to_change: 'hello jQuery',
                            more_fun: ['hello', 'array']
                        }
                    }
                }
            }).display('name', 'complex1');
            subject.renderAs({
                templates: {
                    container:      '<div/>',
                    field:          '<div/>',
                    multi_field:    '<div/>',
                    complex_field:  '<div/>'
                }
            }).appendTo('#foobar-test-container');

            subject.bindings().complex1.to_change.ui().text('goodbye world');
            subject.bindings().complex1.complex2.to_change.ui().text('goodbye javascript');
            subject.bindings().complex1.complex2.complex3.to_change.ui().text('goodbye jQuery');

            subject.update();

            equals(subject.complex1.to_change, 'goodbye world');
            equals(subject.complex1.to_change, 'goodbye world');
            equals(subject.complex1.complex2.to_change, 'goodbye javascript');
            equals(subject.complex1.complex2.complex3.to_change, 'goodbye jQuery');
        });

        /********************************************************************************************************
         *      Abstract Resource Unit Tests
         ********************************************************************************************************/

        test('pull function should utilize ajax service on defining class', function() {
            var mock_service = new jqMock.Mock(TestResource.service, 'GET');
            var stubId = 'stubId';
            var resource = new TestResource({
                id: function() { return stubId; },
                hydrate: Prototype.emptyFunction
            });

            mock_service.modify().args({
                path: stubId,
                success: resource.hydrate
            }).multiplicity(1);
            resource.pull();

            mock_service.verify();
            mock_service.restore();
        });

        test('push function should use the ajax service PUT method for new objects', function() {
            var instance_uri = '12345';
            var LocalTestResource = Class.create(Resource, { id: function() { return instance_uri; } });
            LocalTestResource.service = new WebFacade('local-test-resource/', LocalTestResource);
            var resource = new LocalTestResource();

            var mock_ajax = new jqMock.Mock(jQuery, 'ajax');
            mock_ajax.modify().args(is.objectThatIncludes({
                url:        'local-test-resource/12345/',
                type:       'PUT',
                async:      false,
                dataType:   'json',
                data:       resource.toJSON()
            })).returnValue(undefined);

            resource.push();

            mock_ajax.verifyAll();
            mock_ajax.restore();
        });

        // django resource for testing
        var DjangoTestResource = Class.create2(DjangoResource, {});
        DjangoTestResource.service = { GET: Prototype.emptyFunction };

        module('DjangoResourceAdapter Tests');
        test('all fields should be deserialized inline', function() {
            json = {
                "pk": "demo-list-1",
                "model": "provisioning.mailinglist",
                "fields": {"contacts": [], "created": "2009-04-16 15:18:48"}
            };
            list = new DjangoTestResource(json);
            contacts = list.contacts;
            equals(list.pk,                 'demo-list-1', 'primary key value');
            equals(contacts.size(),         0, 'size of contact list');
            equals(list.created,            '2009-04-16 15:18:48', '**created timestamp');
            ['pk', 'model', 'contacts', 'created'].each(function(e) {
                ok(list.serializable.member(e),
                   'list of serializable fields contains member #{item}'.interpolate({item: e}));
            });
            ok(list.inline_fields.member('contacts'), 'contacts added as an inline field');
            ok(list.inline_fields.member('created'), 'created added as an inline field');
        });

        test('inlined fields should be chunked into a substructure', function() {
            var resource = new DjangoTestResource();
            resource.hydrate({
                pk:     '1234',
                model:  'django.model.ref',
                fields: {
                    name:   'Tim Watson',
                    age:    31
                }
            });
            var name = "Joe Blogs";
            var age  = 62;

            resource.name = name;
            resource.age  = age;
            jqMock.assertThat(
                resource.toJSON(),
                is.objectThatIncludes({
                    pk:     '1234',
                    model:  'django.model.ref',
                    fields: {
                       name:   name,
                       age:    age
                    }
                })
            );
        });

        /*test('', function() {
            var json = undefined;
            var team = new Team(json);
            team
                .bindTo('#teams-list')
                .render("<div id='#{id}'>#{name}</div>")
                .click(function() {
                    this.push();
                });
            var foo = {
                name: 'foo-ish',
                age : 29,
                speak: function() {
                    alert("hello from #{name}: age of #{age}".interpolate(this));
                }
            };

        });*/

        /*
        module('Example tests');
        test('Real Click vs False Click', function(){
            var clicked = false;
            $('#test-form').click(function(){
                    clicked = true;
            });

            //false click
            $('#test-form input').click();
            ok(!clicked);

            //real click
            triggerEvent($('#test-form input').get(0), 'click');
            ok(clicked);
        });

        test('Waiting', function(){
            $('#ajax').load('fixtures/1.html');
            expect(1);//expect 1 assertion, here: fails if ajaxStop is never called
            stop();//pause: so we can wait with setTimeout,setInterval,...
            $().ajaxStop(function(){
                    setTimeout(function(){
                            //field is not filled directly after ajaxStop
                            //since DOM traversal comes after stopping to load
                            equals($('#ajax').html(), 1);//!reverted jsUnit order
                            start();//resume: make sure its called or tests will halt!
                    })
            });
        });
        */
    }
}(jQuery);
