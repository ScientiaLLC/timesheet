var updateDbUser = function (id, manager, admin, mail, groups) {
  // needs to update only ldap fields in case of change
  Meteor.call('updateUserInfo', id, manager, admin, mail, groups);
  // Session.set('search_employee', id);
};

var makeTimesheetForNewUser = function (id, user) {
  Meteor.call('getCurrentWeekObject', function (err, dateObject) {
    if (!err) {
      var dStr = (dateObject.start.getMonth() + 1) + '/' + dateObject.start.getDate() + '/' + dateObject.start.getFullYear(),
          d2Str = (dateObject.end.getMonth() + 1) + '/' + dateObject.end.getDate() + '/' + dateObject.end.getFullYear();

      var projectApprovalArray = [];
      user.projects.forEach(function (pId) {
        var project = ChargeNumbers.findOne({_id: pId});
        if (!project) {
          Meteor.call("removeEmployeeFromProject", user._id, pId);
          return;
        }
        projectId = project._id;
        projectApprovalArray.push({
          projectId: projectId,
          approved: false,
          sentBack: false,
          comment: ''
        });
      });

      Meteor.call("insertTimesheet", dStr, d2Str, id, 1, [], [], 1, '', false, projectApprovalArray, '', false);

    }
  });
};

var userFound = function (username, userstring) {
  logger.debug('client/accounts_ldap_client.js: userFound: username = ' +
      username + ', userstring = ' + JSON.stringify(userstring, null, 4));
  var adminstring = userstring[1];
  var managerstring = userstring[2];
  var user = userstring[0];
  var dbUser = Meteor.users.findOne({username: username});
  var admin = false;

  var i;
  if (adminstring) {
    if (adminstring.constructor === Array) {
      for (i = 0; i < adminstring.length; i++) {
        if (adminstring[i].indexOf('uid=' + username + ',') === 0) {
          admin = true;
        }
      }
    }
  }

  var manager = admin;
  if (managerstring) {
    if (managerstring.constructor === Array) {
      for (i = 0; i < managerstring.length; i++) {
        if (managerstring[i].indexOf('uid=' + username + ',') === 0) {
          manager = true;
        }
      }
    }
  }

  var groups = [];
  if (manager || admin) {
    if (user.memberof) {
      user.memberof.forEach(function (group) {
        groups.push(group.split(',')[0].split('=')[1]);
      });
    } else {
      logger.debug('client/accounts_ldap_client.js: userFound: warning: not a member of any groups');
    }
  }

  logger.debug('client/accounts_ldap_client.js: userFound: dbUser = ' +
      JSON.stringify(dbUser, null, 4));
  if (dbUser) {
    updateDbUser(dbUser._id, manager, admin, user.mail, groups);
  } else {
    var holidayProject = ChargeNumbers.findOne({'is_holiday': true});
    var holiday = [];
    if (holidayProject) {
      holiday = [holidayProject._id];
    }

    Meteor.call('insertNewUser', username, user.cn, manager, admin, user.mail,
        holiday, true, groups, function (error, id) {
      if (!error) {
        makeTimesheetForNewUser(id, Meteor.users.findOne({username: username}));
      }
    });
  }
};

Accounts.config({
    loginExpirationInDays: 7 //Expire loginTokens older than seven days
});

Accounts.registerLoginHandler(function(loginRequest) {
  var userId = null;
  var error = false;
  logger.debug('server/accounts.js: user logging in = ' + loginRequest.username);

  Meteor.call('authenticateLdapEmployee', loginRequest.username, loginRequest.password,
      function (err, userstring) {
    if (err) {
      error = true;
    } else {
      var user = userstring[0];
      if (user) {
        userFound(loginRequest.username, userstring);
      } else {
        error = true;
      }
    }
  });

  // we should have a user at this point
  var user = Meteor.users.findOne({username: loginRequest.username});
  if (!user) {
    error = true;
  } else {
    userId = user._id;
  }

  if (error) {
    logger.error('server/accounts.js: Accounts.registerLoginHandler: error logging in to LDAP');
    return {
      error: 'Log in to LDAP failed'
    }
  } else {
    //creating the token and adding to the user
    var stampedToken = Accounts._generateStampedLoginToken();
    //hashing is something added with Meteor 0.7.x,
    //you don't need to do hashing in previous versions
    var hashStampedToken = Accounts._hashStampedToken(stampedToken);

    Meteor.users.update(userId,
      {$push: {'services.resume.loginTokens': hashStampedToken}}
    );

    //sending token along with the userId
    return {
      userId: userId,
      token: stampedToken.token
    }
  }
});


// borrowed from https://github.com/gui81/muster/blob/master/server/lib/accounts_ldap_server.js

MeteorWrapperLdapjs.Attribute.settings.guid_format =
    MeteorWrapperLdapjs.GUID_FORMAT_B;

// make sure we have read in a Meteor settings file:
if (!Meteor.settings.ldap_url ||
    !Meteor.settings.ldap_search_base ||
    !Meteor.settings.ldap_admin ||
    !Meteor.settings.ldap_admin_account ||
    !Meteor.settings.ldap_admin_password) {
  logger.error('Meteor settings file must be used to work with accounts.js');
}

LDAP = {};
LDAP.ldap = MeteorWrapperLdapjs;
LDAP.client = LDAP.ldap.createClient({
  url: Meteor.settings.ldap_url + 'cn=users,cn=accounts,' + Meteor.settings.ldap_search_base
});

var ldapSearchResult = [];

var wrappedLdapBind = Meteor.wrapAsync(LDAP.client.bind, LDAP.client);
// the search method still requires a callback because it is an event-emitter
LDAP.asyncSearch = function (binddn, opts, callback) {
  logger.debug('server/accounts.js: asyncSearch: binddn = ' + binddn +
      ', opts = ' + JSON.stringify(opts, null, 4));
  LDAP.client.search(binddn, opts, function (err, search) {
    if (err) {
      callback(false);
    } else {

      search.on('searchEntry', function (entry) {
        ldapSearchResult.push(entry.object);
      });
      search.on('end', function (entry) {
        if (ldapSearchResult.length === 1) {
          ldapSearchResult = ldapSearchResult[0];
        }
        var tempLdapSearchResult = ldapSearchResult;
        ldapSearchResult = [];
        callback(null, tempLdapSearchResult);
      });

      search.on('error', function (err) {
        console.log('search error: ' + err);
        ldapSearchResult = [];
        callback(false);
      });
    }
  });
};
var wrappedLdapSearch = Meteor.wrapAsync(LDAP.asyncSearch, LDAP);

LDAP.search = function (username) {
  var opts = {
    filter: '(uid=' + username + ')',
    scope: 'sub',
    attributes: ['cn', 'mail', 'memberof']  // add more ldap search attributes here when needed
  };

  return wrappedLdapSearch('cn=users,cn=accounts,' + Meteor.settings.ldap_search_base, opts);
};

LDAP.getGroupList = function (isAdminList) {
  var opts;
  if (isAdminList) {
    logger.debug('server/accounts.js: getGroupList: getting admin list');
    opts = {
      filter: '(cn=' + Meteor.settings.ldap_admin + ')',
      scope: 'sub',
      attributes: ['member']  // add more ldap search attributes here when needed
    };
  } else {
    logger.debug('server/accounts.js: getGroupList: getting manager list');
    var filterStr = null;
    ChargeNumbers.find({}).forEach(function (cn) {
      logger.debug('server/accounts.js: getGroupList: cn = ' + JSON.stringify(cn, null, 4));
      var sDate = new Date(cn.startDate);
      var eDate = new Date(cn.endDate);
      var today = new Date();
      if (cn.manager !== Meteor.settings.ldap_admin && sDate <= today && eDate >= today) {
        if (!filterStr) {
          filterStr = '(cn=' + cn.manager + ')';
        } else {
          filterStr = '(|' + filterStr + '(cn=' + cn.manager + '))';
        }
      }
    });
    opts = {
      filter: filterStr,
      scope: 'sub',
      attributes: ['member']  // add more ldap search attributes here when needed
    };
    if (!filterStr) {
      logger.debug('server/accounts.js: getGroupList: filterStr empty');
      return {
        member: null
      };
    }
  }

  var res = wrappedLdapSearch('cn=groups,cn=accounts,' + Meteor.settings.ldap_search_base, opts);
  logger.debug('server/accounts.js: getGroupList: res = ' + JSON.stringify(res, null, 4));
  return res;
};

LDAP.getAllGroups = function () {
  logger.debug('server/accounts.js: getAllGroups');
  var opts = {
    filter: '(objectClass=ipausergroup)',
    scope: 'sub',
    attributes: ['cn']  // add more ldap search attributes here when needed
  };

  return wrappedLdapSearch('cn=groups,cn=accounts,' + Meteor.settings.ldap_search_base, opts);
};

LDAP.checkAccount = function (username, password) {
  var binddn = 'uid=' + username + ',cn=users,cn=accounts,' + Meteor.settings.ldap_search_base;
  if (wrappedLdapBind(binddn, password).status == 0) {
    return true;
  }

  return false;
};

LDAP.bind = function () {
  var binddn = 'uid=' + Meteor.settings.ldap_admin_account + ',cn=users,cn=accounts,' + Meteor.settings.ldap_search_base;
  logger.debug('server/accounts.js: binddn = ' + binddn);
  if (wrappedLdapBind(binddn, Meteor.settings.ldap_admin_password).status == 0) {
    return true;
  }

  return false;
};

LDAP.getLdapAdmin = function () {
  return Meteor.settings.ldap_admin;
};

LDAP.getLdapManagerGroups = function () {
  var names = [];
  var groups = LDAP.getAllGroups();
  if (groups) {
    groups.forEach(function (group) {
      names.push(group.cn);
    });
  } else {
    console.log('could not get all LDAP groups');
  }

  return names;
};

Meteor.startup(function () {
  Meteor.methods({
    // returns either null or the user
    authenticateLdapEmployee: function (username, password) {
      try {
        if (LDAP.checkAccount(username, password)) {
          return [LDAP.search(username),
                  LDAP.getGroupList(true).member,
                  LDAP.getGroupList(false).member];
        } else {
          return null;
        }
      } catch (e) {
        console.log('caught exception when interracting with LDAP server: ' + e.message);
        return [false, false, false];
      }
    },

    getLdapEmployee: function (username) {
      try {
        if (LDAP.bind()) {
          return [LDAP.search(username),
                  LDAP.getGroupList(true).member,
                  LDAP.getGroupList(false).member];
        } else {
          return null;
        }
      } catch (e) {
        console.log('caught exception when interracting with LDAP server: ' + e.message);
        return [false, false, false];
      }
    },

    getLdapManagerGroups: function () {
      try {
        return LDAP.getLdapManagerGroups();
      } catch (e) {
        console.log('caught exception when interracting with LDAP server: ' + e.message);
        return [false, false, false];
      }
    }
  });
});
