var solution = current.solution_name;  

// query ml_cluster_detail for detail records for the selected solution name, for the active solution record.
var grClusterDetail = new GlideRecord("ml_cluster_detail");

grClusterDetail.addQuery('solution.solution_name', solution);
grClusterDetail.addQuery('solution.active', true);
grClusterDetail.nullQuery('u_int_duration');        // reduces run time 

grClusterDetail.query();

while (grClusterDetail.next()) {    // while there are detai records

	// get a pointer to the record that generated this detail in the cluster
	// this will be an Incident, a RITM, a CSM or HRSD record. 
	// rec_table holds that table name
    var grTableRecord = new GlideRecord(grClusterDetail.rec_table);
    if (grTableRecord.get(grClusterDetail.rec_sys_id)) {

        grClusterDetail.setValue('u_int_duration', grTableRecord.getValue('calendar_stc'));
        grClusterDetail.update();
    }

}
