
// override some of the based
var DjangoResource = Module.create(Resource, {
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
        var data = $H(json);
        fields = data.unset('fields');
        data.update(fields || {});
        this.inline_fields = Object.keys(fields);
        return Resource.hydrate.apply(this, [data]);
    }
});
