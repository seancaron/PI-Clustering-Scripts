var sol = current.sys_id;
var solGr = new GlideRecord('ml_solution');
solGr.get(sol);
var fields = solGr.getValue('prediction_input_fields').split(',');
var refTable = solGr.getValue('table');
var detailGr = new GlideRecord('ml_cluster_detail');
detailGr.addQuery('solution', sol);
detailGr.NullQuery('cluster_attr1'); // added to reduce runtime
detailGr.query();
while (detailGr.next()) {
    var recSysId = detailGr.getValue('rec_sys_id');
    var rGr = new GlideRecord(refTable);
    rGr.get(recSysId);
    for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        var val = rGr.getValue(field);
        var col = 'cluster_attr' + (i + 1);
        detailGr.setValue(col, val);
    }
    detailGr.update();
}
