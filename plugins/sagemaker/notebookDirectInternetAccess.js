var async = require('async');
var helpers = require('../../helpers');

module.exports = {
	title: 'Notebook Direct Internet Access',
	category: 'SageMaker',
	description: 'Ensure Notebook Instance is not publicly available.',
	more_info: 'SageMaker notebooks should not be exposed to the Internet. Public availability can be configured via the DirectInternetAccess attribute.',
	recommended_action: 'Disable DirectInternetAccess for each SageMaker notebook.',
	link: 'https://docs.aws.amazon.com/sagemaker/latest/dg/appendix-additional-considerations.html#appendix-notebook-and-internet-access',
	apis: ['SageMaker:listNotebookInstances', 'SageMaker:describeNotebookInstance'],

	run: function(cache, settings, callback) {
		var results = [];
		var source = {};
		var regions = helpers.regions(settings.govcloud);

		async.each(regions.sagemaker, function(region, rcb){
			var listNotebookInstances = helpers.addSource(cache, source,
				['sagemaker', 'listNotebookInstances', region]);

			if (!listNotebookInstances) return rcb();

			if (listNotebookInstances.err) {
				helpers.addResult(results, 3,
					'Unable to query for Notebook Instances: ' +
					helpers.addError(listNotebookInstances), region);
				return rcb();
			}

			if (!listNotebookInstances.data || !listNotebookInstances.data.length) {
				helpers.addResult(
					results, 0, 'No Notebook Instances found', region);
				return rcb();
			}

			for (i in listNotebookInstances.data) {
				var instance = listNotebookInstances.data[i];
				var instanceName = instance.NotebookInstanceName;
				var instanceArn = instance.NotebookInstanceArn;

				var describeNotebookInstance = helpers.addSource(cache, source,
					['sagemaker', 'describeNotebookInstance', region, instanceName]);

				if (!instance.KmsKeyId){
					helpers.addResult(results, 2,
						'KMS key not found for Notebook Instance', region, instanceArn);
				} else {
					helpers.addResult(results, 0,
						'KMS key found for Notebook Instance', region, instanceArn);
				}

				if (instance.DirectInternetAccess &&
					instance.DirectInternetAccess == 'Enabled'){
					helpers.addResult(results, 2,
					'Direct Internet access is enabled', region, instanceArn);
				} else {
					helpers.addResult(results, 0,
					'Direct Internet access is not enabled', region, instanceArn);
				}
			}

			rcb();
		}, function(){
			callback(null, results, source);
		});
	}
};
