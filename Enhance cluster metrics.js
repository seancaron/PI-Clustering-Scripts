var median = 0;
var mean = 0;
var outlier = 0;
var detailCount = 0;

 

// look at the solution we selected the UI Action for
var solution = current.solution_name;

 

///////////////////////////////////////

 


//bring back each cluster from the active model for the slected solution
var grClusterSummary = new GlideRecord("ml_cluster_summary");
grClusterSummary.addQuery('solution.solution_name', solution);
grClusterSummary.addQuery('solution.active', true);
grClusterSummary.orderBy('cluster_id');

 

// for testing - limit the scope to 3 CLuster Summary records
//    grClusterSummary.setLimit(3);
//

 

grClusterSummary.query();

 

while (grClusterSummary.next()) {

 

// first, we need to remove outliers from the int_Duration field
//
// for our purposes, we'll consider an outlier to be a value greater than 5 sigma
// 
// duration is an exponentially distributed population - so sigma is actually the artihmetic mean
// go get the mean value using Glide Aggregate

 


    // Preprocess to get the mean
    var gaClusterDetailPre = new GlideAggregate("ml_cluster_detail");
    gaClusterDetailPre.addQuery('cluster_id.cluster_id', grClusterSummary.getValue('cluster_id'));
    gaClusterDetailPre.addQuery('solution.solution_name', solution);
    gaClusterDetailPre.addQuery('solution.active', true);

 

    gaClusterDetailPre.setGroup(false);

 

    gaClusterDetailPre.addAggregate('AVG', 'u_int_duration');

 

    gaClusterDetailPre.query();

 

    if (gaClusterDetailPre.next()) {
        mean    = gaClusterDetailPre.getAggregate('AVG', 'u_int_duration');
        outlier = mean * 5;    // 5 sigma outliers

 

        // now process the Cluster Detail records for this cluster and set outlier int_duration 
        // to -1 as an "outlier flag"
        var grClusterDetailPre = new GlideRecord("ml_cluster_detail");
        grClusterDetailPre.addQuery('cluster_id.cluster_id', grClusterSummary.getValue('cluster_id'));
        grClusterDetailPre.addQuery('solution.solution_name', solution);
        grClusterDetailPre.addQuery('solution.active', true);
        grClusterDetailPre.addQuery('u_int_duration', '>', outlier);

 

        grClusterDetailPre.query();
    
        // loop thru the outliers, setting the int_duration to -1
        while (grClusterDetailPre.next()) {
            grClusterDetailPre.setValue('u_int_duration', -1);
            grClusterDetailPre.update();
        }
    }

 

 

    // now post-process on the dataset with outliers removed
    // use Glide Aggregate to get the avg, min, and max u_int_duration values for each cluster summary
    var gaClusterDetailPost = new GlideAggregate("ml_cluster_detail");
    gaClusterDetailPost.addQuery('cluster_id.cluster_id', grClusterSummary.getValue('cluster_id'));
    gaClusterDetailPost.addQuery('solution.solution_name', solution);
    gaClusterDetailPost.addQuery('solution.active', true);
    gaClusterDetailPost.addQuery('u_int_duration', '>', 0);     // filter out the outliers

 

    gaClusterDetailPost.setGroup(false);

 

    gaClusterDetailPost.addAggregate('MIN', 'u_int_duration');
    gaClusterDetailPost.addAggregate('MAX', 'u_int_duration');
    gaClusterDetailPost.addAggregate('AVG', 'u_int_duration');
    gaClusterDetailPost.addAggregate('COUNT');

 

    gaClusterDetailPost.query();

 

    if (gaClusterDetailPost.next()) {
        grClusterSummary.setValue('u_duration_max', gaClusterDetailPost.getAggregate('MAX', 'u_int_duration'));
        grClusterSummary.setValue('u_duration_min', gaClusterDetailPost.getAggregate('MIN', 'u_int_duration'));
        grClusterSummary.setValue('u_duration_average', gaClusterDetailPost.getAggregate('AVG', 'u_int_duration'));
        grClusterSummary.update();

 

        detailCount = gaClusterDetailPost.getAggregate('COUNT');
    }

 

    // ok -  now pluck out the median value
    // get a pointer to the Cluster Detail table 
    var grClusterDetailPost = new GlideRecord("ml_cluster_detail");
    grClusterDetailPost.addQuery('cluster_id.cluster_id', grClusterSummary.getValue('cluster_id'));
    grClusterDetailPost.addQuery('solution.solution_name', solution);
    grClusterDetailPost.addQuery('solution.active', true);
    grClusterDetailPost.addQuery('u_int_duration', '>', 0);     // filter out the outliers

 

    grClusterDetailPost.orderBy('u_int_duration');

 

    // median is the "middle value" - get a pointer to the middle of the cluster
    median = Math.floor(detailCount / 2);

 

    // chooseWindow wil limit the recordset that the gr points to to JUST that middle value
    grClusterDetailPost.chooseWindow(median - 1, median);

 

    grClusterDetailPost.query();
    

 

    // now populate the ClusterSummary record with the median, the index, and the description
    //
    // index = Size of Cluster * Cluster quality * Median
    //      size * quality is a rough indication of the "effective size" of the cluster
    //      median is the "most represetnative" amount of time this issue takes to resolve
    // so index is a good indication for "overall, how serious an impact does this cluster have"
    
    if (grClusterDetailPost.next()) {
        grClusterSummary.setValue('u_duration_median', grClusterDetailPost.getValue('u_int_duration'));
        grClusterSummary.setValue('u_cluster_description', grClusterSummary.getValue('cluster_id') + ' - ' + grClusterSummary.getValue('cluster_concept'));
        grClusterSummary.setValue('u_index', grClusterSummary.getValue('cluster_size') * grClusterSummary.getValue('cluster_quality') /100 * grClusterDetailPost.getValue('u_int_duration'));
        grClusterSummary.update();
    }
}
