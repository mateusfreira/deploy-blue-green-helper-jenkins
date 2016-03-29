const Q = require('q'),
  _ = require('lodash'),
  rp = require('request-promise'),
  jenkinsapi = require('jenkins-api'),
  deployerManager = require("deploy-blue-green-helper");

var JenkinsDeployer = function (jenkinsOption, enviromentOptions) {
  const jenkins = jenkinsapi.init(jenkinsOption.jenkinsUrl),
    self = this,
    log = function (message) {
      if (jenkinsOption.debug) {
        console.log(message);
      }
    };

  this.getBuildInfo = function () {
    log(["geting BuildInfo ", enviromentOptions]);
    var defer = Q.defer();
    jenkins.last_build_info(enviromentOptions.jobName, function (err, data) {
      log(["BuildInfo reponse", err, data]);
      if (err) {
        defer.reject(err);
      } else {
        defer.resolve(data);
      }
    });
    return defer.promise;
  };

  this.run = function () {
    log("Ruining build " + enviromentOptions.jobName);
    var defer = Q.defer();
    jenkins.build(enviromentOptions.jobName, function (err, data) {
      if (!err) {
        log(["No errors ruining build " + enviromentOptions.jobName, data]);
        defer.resolve(data);
      } else {
        log(["Some error happen ruining build " + enviromentOptions.jobName, err]);
        defer.reject(err);
      }
    });
    return defer.promise;
  };

  this.stop = function (userOptions) {
    log(["Stoping build " + enviromentOptions.jobName]);
    var defer = Q.defer();
    self.getBuildInfo().then(function (data) {
      try {
        jenkins.stop_build(enviromentOptions.jobName, data.number, function (e, r) {
          if (!e) {
            log(["No errors stoping build " + enviromentOptions.jobName]);
            defer.resolve(r);
          } else {
            log(["Some error happen stoping build " + enviromentOptions.jobName, e]);
            defer.reject(e);
          }


        });
      } catch (e) {
        defer.reject(e);
      }
    });
    return defer.promise;
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
