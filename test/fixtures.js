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

        test('renderAs function should create contain and fields using default templates when literals are given', function() {
            var id = '12345';
            var name = "DWORD Smith";
            var age = 'Old as the hills';
            var subject = new TestResource({ pk: id, name: name, age: age });

            var content = subject
                .display('name', 'age')
                .renderAs({
                    container: '<ul/>',
                    field:     '<li/>'
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
                    container_template: '<ul id="#{id}"></ul>',
                    field_template:     '<li parent="#{object.id}">#{field.value}</li>'
                }).appendTo('#target3');
            equals(jQuery('#target3').html(),
                '<ul id="12345"><li class="name" parent="12345">DWORD Smith</li><li class="age" parent="12345">Old as the hills</li></ul>');
        });

        test("renderAs function should return a wrapped set of the new content", function() {
            var selector = '#testBinding5';
            var id = 'bob';
            var subject = new TestResource({ pk: id, uri: 'foo', name: 'Bob Dillan' });
            subject.display('name').renderAs({
                container_template: '<form id="#{id}" method="POST" action="#{uri}></form>',
                field:              '<input/>'
            }).appendTo(selector).bind('changed', function(e) {
                subject.name = $(e.target).val();
                return false;
            });

            var update = "Aerosmith";
            $("#bob .name").val(update).trigger('changed');
            equals(subject.name, update, "resetting object property based on event handler returned from renderTo");
        });


        module('RenderStrategy Tests');
        test('it should puke if you try to initialize with no fields', function() {
            jqMock.expectThatExceptionThrown(function() { new RenderStrategy({}); },
                is.exception({
                    message: "RenderStrategy requires option [fields].",
                    type: ArgumentException
                })
            );
        });

        test('it should puke if you try to initialize with no container rule', function() {
            jqMock.expectThatExceptionThrown(function() {
                    new RenderStrategy({
                        fields:     { name: 'name' },
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
                        fields:     { contacts: contacts },
                        templates:  {
                            container:  '<div/>',
                            field:      '<div/>'
                        }
                    }).render();
                },
                is.exception({
                    message: "RenderStrategy requires a rule or template for [multi_field].",
                    type: IllegalOperationException
                })
            );
	});
        
        test('it should puke if you try to render objects with no complex_field rule', function() {
            var contacts = [ 'foo.bar@gmail.com', 'a.b@c.com' ];
            jqMock.expectThatExceptionThrown(function() {
                    new RenderStrategy({
                        fields:     {
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
                    message: "RenderStrategy requires a rule or template for [complex_field].",
                    type: IllegalOperationException
                })
            );                
        });

        test('render should do X when field is an array', function() {
            var id = 'x909';
            var name = "Foo Bar";
            var age = '999';
            var subject = { id: id, name: name, contacts: [ 'foo.bar@gmail.com', 'a.b@c.com' ] };
            var contacts = subject.contacts;

            var strategy = new RenderStrategy({
                context: subject,
                fields: {
                    name: name,
                    contacts: contacts
                },
                templates: {
                    container:              '<ul/>',
                    field:                  '<li/>',
                    multi_field_template:   '<div><ul>#{$items}</ul></div>'
                }
            });
            var content = strategy.render().appendTo('#targetX');
            equals($('#targetX').html(),
                '<ul id="x909">' +
                    '<li class="name">Foo Bar</li>' +
                    '<li class="contacts">'         +
                        '<div>'                     +
                            '<ul>'                  +
                                '<li class="items index1">foo.bar@gmail.com</li>'    +
                                '<li class="items index2">a.b@c.com</li>'            +
                            '</ul>'                 +
                        '</div>'                    +
                    '</li>'                         +
                '</ul>');
            equals($('#x909 .contacts .items .index1').text(), 'foo.bar@gmail.com');
            equals($('#x909 .contacts .items .index2').text(), 'a.b@c.com');
        });


        /********************************************************************************************************
         *      Bindable Unit Tests
         ********************************************************************************************************/

        module('Bindable Tests');

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

            var content = subject.renderTo('#test-form', form_template).addClass('someCSS');

            jQuery('#submit-button', content)
                .one('click', function() {
                    subject.update('name', 'age');
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
            subject.update('name');  //if this really happend, the call to binding.val() would place '' or undefined in the name attribute
            equals(subject.name, 'foobar');
        });

        test('refresh should silently ignore you if no binding was specified', function() {
            var subject = new TestResource();
            subject.refreshUI();
        });

        test('refresh should update bound dom elements when a binding has taken place', function() {
            var subject = new TestResource({ pk: 'subject197', name: 'Joe the Man', handle: 'jdm' });
            subject.container('#test-container1');
            subject.display('name', 'handle')
                   .renderAs({ container: '<div/>', field: '<input/>' })
                   .appendTo('#test-container1');

            subject.name = 'Darth Vader';
            subject.handle = 'ManNamedSue';

            subject.refreshUI();
            equals(subject.ui('name').val(), subject.name);
            equals(subject.ui('handle').val(), subject.handle);
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
