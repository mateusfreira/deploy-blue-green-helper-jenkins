const Promise = require("bluebird"),
  _ = require('lodash'),
  rp = require('request-promise'),
  jenkinsapi = require('jenkins-api'),
  deployerManager = require("deploy-blue-green-helper");

const JenkinsDeployer = function (jenkinsOption, enviromentOptions) {
  const jenkins = jenkinsapi.init(jenkinsOption.jenkinsUrl),
    self = this,
    log = function (message) {
      if (jenkinsOption.debug) {
        console.log(message);
      }
    },
    jenkinsPromise = Promise.promisifyAll(jenkins);
  this.getBuildInfo = function () {
    log(["geting BuildInfo ", enviromentOptions]);
    return jenkinsPromise.last_build_infoAsync(enviromentOptions.jobName).then(function (data) {
      log(["BuildInfo reponse", data]);
      return data;
    });
  };

  this.run = function () {
    log("Ruining build " + enviromentOptions.jobName);
    return jenkinsPromise.buildAsync(enviromentOptions.jobName).then(function (data) {
      log(["No errors ruining build " + enviromentOptions.jobName, data]);
      return data;
    }).catch(function (err) {
      log(["Some error happen ruining build " + enviromentOptions.jobName, err]);
    });
  };

  this.stop = function (userOptions) {
    log(["Stoping build " + enviromentOptions.jobName]);
    return self.getBuildInfo().then(function (data) {
      return jenkinsPromise.stop_buildAsync(enviromentOptions.jobName, data.number);
    }).then(function (r) {
      log(["No errors stoping build " + enviromentOptions.jobName]);
      return r;
    }).catch(function (e) {
      log(["Some error happen stoping build " + enviromentOptions.jobName, e]);
      return e;
    });
  };

  this.isRuning = function (userOptions) {
    return this.getBuildInfo().then(function (data) {
      return data.building;
    });
  };
};


const createADeployer = function (jenkinsOptions, envOptions) {
  return _.assignIn(_.clone(envOptions), {
    deployer: new JenkinsDeployer(jenkinsOptions, envOptions)
  });
};

module.exports = {
  create: function (jenkinsOptions, blueOptions, greenOptions) {
    const jenkinsBlueOptions = createADeployer(jenkinsOptions, blueOptions);
    const jenkinsGreenOptions = createADeployer(jenkinsOptions, greenOptions);
    return {
      deploy: function () {
        return deployerManager.deploy(jenkinsBlueOptions, jenkinsGreenOptions);
      }
    };
  }
};
