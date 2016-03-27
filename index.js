const Q = require('q'),
  _ = require('lodash'),
  rp = require('request-promise'),
  jenkinsapi = require('jenkins-api');

var JenkinsDeployer = function (jenkinsOption) {
  const jenkins = jenkinsapi.init(jenkinsOption.jenkinsUrl),
    self = this,
    log = function (message) {
      if (jenkinsOption.debug) {
        console.log(message);
      }
    };

  this.getBuildInfo = function () {
    log("geting BuildInfo ");
    var defer = Q.defer();
    jenkins.last_build_info(jenkinsOption.jobName, function (err, data) {
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
    log("Ruining build " + jenkinsOption.jobName);
    var defer = Q.defer();
    jenkins.build(jenkinsOption.jobName, function (err, data) {
      if (!err) {
        log(["No errors ruining build " + jenkinsOption.jobName, data]);
        defer.resolve(data);
      } else {
        log(["Some error happen ruining build " + jenkinsOption.jobName, err]);
        defer.reject(err);
      }
    });
    return defer.promise;
  };

  this.stop = function (userOptions) {
    log(["Stoping build " + jenkinsOption.jobName]);
    var defer = Q.defer();
    self.getBuildInfo().then(function (data) {
      try {
        jenkins.stop_build(jenkinsOption.jobName, data.number, function (e, r) {
          if (!e) {
            log(["No errors stoping build " + jenkinsOption.jobName]);
            defer.resolve(r);
          } else {
            log(["Some error happen stoping build " + jenkinsOption.jobName, e]);
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


module.exports = {
  create: function (userOptions) {
    return new JenkinsDeployer(userOptions);
  }
}
