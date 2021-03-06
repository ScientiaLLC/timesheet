(function(){Template.PDF.events = {
  'click button': function (event) {
    var userID = Meteor.userId();
    if (Session.get('search_employee')) {
      userID = Session.get('search_employee');
    }
    generalHelpers.makePDF(Session.get('startDate'), userID);
  }
};

Template.historyHeader.helpers({
  /*
   * Retreives all of the timesheets from the current user.
   * Also retreives timesheets of employees that are under a manager's supervision,
   *      but only if they have hours submitted for the manager's projects.
   * If the user is an admin, then it will retreive all timesheets.
   * If they searched for a specific employee name, get only that employee's timesheets.
   */
  getTimesheets: function (project) {
    var userId = '';
    if (Session.get('search_employee')) {
      userId = Session.get('search_employee');
    }
    var timesheetProjects = [];
    var timesheets = [];
    var projectsEntries = [];
    var subordinates = ActiveDBService.getEmployeesUnderManager();
    var sort = {'sort': {'userId': 1, 'startDate': -1}};

    var user = Meteor.user();
    var managerProjects = ChargeNumbers.find({'manager': {$in: user.groups}});
    var managerProjIds = [];
    managerProjects.forEach(function (p) {
      managerProjIds.push(p.id);
    });


    // logger.debug('userId = ' + userId);
    if (userId !== '') {
      TimeSheet.find({
        'userId': userId, 'projectEntriesArray.projectId': project
      }, sort).forEach(
          function (u) {
            // logger.debug('u(userID found) = ' + JSON.stringify(u));
            u.projectEntriesArray.forEach(function (p) {
              if(p.projectId === project){

                  timesheetProjects.push(p.projectId);

                if (findOneInArray(managerProjIds, timesheetProjects)  || u.userId === user._id || user.admin ){//&& !containsInArray(p.projectId, timesheetProjects)) {
                  timesheets = (ActiveDBService.getTimesheetRowInfo(u, timesheets, p.projectId));
                }
              }
            });
          });
    } else {
      TimeSheet.find({
        'userId': {$in: subordinates}, 'projectEntriesArray.projectId': project
      }, sort).forEach(
          function (u) {
            // logger.debug('u(userID not found) = ' + JSON.stringify(u));
            u.projectEntriesArray.forEach(function (p) {

              if(p.projectId === project){

                  timesheetProjects.push(p.projectId);

                if (findOneInArray(managerProjIds, timesheetProjects)  || u.userId === user._id || user.admin ){//&& !containsInArray(p.projectId, timesheetProjects)) {
                  timesheets = (ActiveDBService.getTimesheetRowInfo(u, timesheets, p.projectId));
                }
              }
            });

        });
      }

    // logger.debug('timesheets = ' + JSON.stringify(timesheets));
    return timesheets;

  },

  getProjects: function () {
    var projects = [];

    if(Session.get('search_project') == ''){
      ChargeNumbers.find().forEach(function (p) {
        TimeSheet.find().forEach(function (timesheets){
           if(timesheets.projectEntriesArray != null){
              if(!containsInArray(p, projects)){

              projects.push(p);
            }
          }
        });
      });
    }  else if (Session.get('search_project') != null || Session.get('search_project') != '') {
      ChargeNumbers.find({'name': Session.get('search_project')}).forEach(function (p){
        TimeSheet.find().forEach(function (timesheets){
           if(timesheets.projectEntriesArray != null){
             if(!containsInArray(p, projects)){
              projects.push(p);
            }
          }
        });
      });
    }
    return projects;
  },

  ActiveTimesheet: function (userId, active) {
    if (active && (userId === Meteor.userId())) {
      return true;
    }
    return false;
  }
});

function findOneInArray(array1, array2) {
  var found = false;
  for (var i = 0; i < array1.length; i++) {
    if (array2.indexOf(array1[i]) > -1) {
      found = true;
      break;
    }
  }
  return found;
}

Template.historicalEntries.helpers({
  isManager: function () {
    var user = Meteor.user();
    if (user && (user.manager || user.admin)) {
      return true;
    } else {
      return false;
    }
  }
});

Template.historyInfo.helpers({
  isAdmin: function () {
    var user = Meteor.user();
    if (user && user.admin) {
      return true;
    } else {
      return false;
    }
  }
});

/* Historical Date picker
 * Only if using datepicker box instead of forward/backward buttons
 */
Template.history_month_picker.rendered = function () {
  $('#month_select').datepicker({
    format: 'mm/yyyy',
    startView: 2,
    minViewMode: 1,
    autoclose: true,
    setDate: new Date()
  });

  $('#month_select').on('changeDate', function (event) {
    Session.set('yearSelect', false);
    Session.set('historyDate', $('#month_select').datepicker('getDate'));
  });
};

Template.history_month_picker.helpers({
  currentYear: function () {
    var currentTime;
    currentTime = new Date();
    currentTime.setDate(1);
    Session.set('historyDate', currentTime);

    return currentTime.getFullYear();
  },

  currentMonth: function () {
    var currentTime;
      currentTime = new Date();
      currentTime.setDate(1);
      Session.set('historyDate', currentTime);

    return generalHelpers.getMonthName(currentTime.getMonth());
  }
});

Template.history_month_picker.events({
  'click .btn': function () {
    Session.set('yearSelect', true);
    Session.set('historyDate', Session.get('historyDate'));
  },
  'click .prevMonth': function () {
    var startDate = Session.get('historyDate');

    var d2 = new Date(startDate);
    var mo = d2.getMonth() - 1;
    if (mo === -1) {
      mo = 11;
      d2.setYear(d2.getFullYear() - 1);
    }
    d2.setMonth(mo);

    Session.set('historyDate', d2);
  },
  'click .nextMonth': function () {
    var startDate = Session.get('historyDate');

    var d2 = new Date(startDate);
    var mo = d2.getMonth() + 1;
    if (mo === 12) {
      mo = 0;
      d2.setYear(d2.getFullYear() + 1);
    }
    d2.setMonth(mo);

    //don't advance past current month
    if (d2 > new Date()) {
      return;
    }

    Session.set('historyDate', d2);
  },
  'click .prevYear': function () {
    var startDate = Session.get('historyDate');

    var d2 = new Date(startDate);
    var yr = d2.getFullYear() - 1;
    d2.setFullYear(yr);

    Session.set('historyDate', d2);
  },
  'click .nextYear': function () {
    var startDate = Session.get('historyDate');

    var d2 = new Date(startDate);
    var yr = d2.getFullYear() + 1;
    d2.setFullYear(yr);

    //don't advance past current month
    if (d2 > new Date()) {
      return;
    }

    Session.set('historyDate', d2);
  }
});

Template.historyYearSelect.helpers({
  getYears: function () {
    var userId = Meteor.userId();
    if (Session.get('search_employee')) {
      userId = Session.get('search_employee');
    }
    var years = [];

    TimeSheet.find({'userId': userId}).forEach(
        function (u) {
          var timesheetYear = u.startDate.split('/')[2];
          if (!(timesheetYear in years)) {
            years[timesheetYear] = {year: timesheetYear};
          }
        });
    return years;
  }
});

Template.historyInfo.events({
  'click .view': function (event) {
    Session.set('current_page', 'historical_timesheet');
    var row = event.currentTarget.parentNode.parentNode;
    var startDate = $(row).find('#StartDate')[0].value;
    Session.set('startDate', startDate);
    Session.set('search_employee', Meteor.users.findOne({'username': $(row).find('#Employee')[0].value})._id);
  },
  'click .reject': function (event) {
    var row = event.currentTarget.parentNode.parentNode;
    var date = $(row).find('#StartDate')[0].value;
    var userId = Meteor.users.findOne({'username': $(row).find('#Employee')[0].value})._id;
    var projectId = event.currentTarget.name;
    var rejectComment = $(row).find('#rejectComment')[0].value;
    alert('date: ' + date + ' userId: ' + userId + ' projectId: ' + projectId + ' rejectComment: ' + rejectComment);
    ActiveDBService.updateApprovalStatusInTimeSheet(date, userId, projectId, false, rejectComment);
    ActiveDBService.updateActiveStatusInTimesheet(date, userId, projectId);
  }
});

/*
 * Functions related to the individual timesheet lookup page.
 */

Template.SelectedHistoryTimesheet.helpers({
  row: function () {
    var date = Session.get('startDate');
    var user = Meteor.userId();
    if (Session.get('search_employee')) {
      user = Session.get('search_employee');
    }
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    var projectEntries = sheet.projectEntriesArray;

    var rows = [];
    var maxRow = -1;
    for (var i = 0; i < projectEntries.length; i++) {
      var project = projectEntries[i].projectId;
      var sentBack;
      if (projectEntries[i].SentBack) {
        sentBack = 'sentBack';
      } else {
        sentBack = 'notSentBack';
      }

      var EntryArray = projectEntries[i].EntryArray;
      for (var j = 0; j < EntryArray.length; j++) {
        var comment = EntryArray[j].Comment;
        var rowID = EntryArray[j].rowID;
        if (rowID > maxRow) {
          maxRow = rowID;
        }
        var hours = EntryArray[j].hours;
        rows.push({
          'project': project,
          'sunday': hours[0],
          'monday': hours[1],
          'tuesday': hours[2],
          'wednesday': hours[3],
          'thursday': hours[4],
          'friday': hours[5],
          'saturday': hours[6],
          'comment': comment,
          'rowID': rowID,
          'sentBack': sentBack
        });
      }
    }

    function compare(a, b) {
      if (a.rowID < b.rowID) {
        return -1;
      }
      if (a.rowID > b.rowID) {
        return 1;
      }
      return 0;
    }

    Session.set('max_Row', maxRow);
    return rows.sort(compare);
  },

  project: function () {
    var date = Session.get('startDate');
    var user = Meteor.userId();
    if (Session.get('search_employee')) {
      user = Session.get('search_employee');
    }
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    var projectEntries = sheet.projectEntriesArray;

    var projects = [];

    for (var i = 0; i < projectEntries.length; i++) {
      var project = projectEntries[i].projectId;
      var sentBack;
      if (projectEntries[i].SentBack) {
        sentBack = 'sentBack';
      } else {
        sentBack = 'notSentBack';
      }
      projects.push({
        'project': project,
        'sentBack': sentBack
      });
    }

    return projects;
  },

  date: function () {
    var date = Session.get('startDate');
    var sheet = TimeSheet.findOne({'startDate': date});
    if (!sheet) {
      return;
    }
    return date + ' - ' + sheet.endDate;
  },

  timesheethack: function () {
    var date = Session.get('startDate');
    var user = Meteor.userId();
    if (Session.get('search_employee')) {
      user = Session.get('search_employee');
    }
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    var projectEntries = sheet.projectEntriesArray;

    var sentBack = 'notSentBack';
    for (var i = 0; i < projectEntries.length; i++) {
      if (projectEntries[i].SentBack) {
        sentBack = 'sentBack';
      }
    }
    var returned = [];
    returned.push({'sentBack': sentBack});

    return returned;
  },
  employee: function () {
    var employee = Meteor.users.findOne({'_id': Session.get('search_employee')});
    return employee.username;
  }
});

Template.historyProjectHours.helpers({
  'name': function (projectId) {
    var name = ChargeNumbers.findOne({'_id': projectId});
    return name.name;
  }
});

Template.historyProjectComments.helpers({
  'name': function (projectId) {
    var name = ChargeNumbers.findOne({'_id': projectId});
    return name.name;
  },

  next: function (projectId) {
    var date = Session.get('startDate');
    var user = Meteor.userId();
    if (Session.get('search_employee')) {
      user = Session.get('search_employee');
    }
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    var prEntriesArr = sheet.projectEntriesArray;

    var index = 0;
    for (var i = 0; i < prEntriesArr.length; i++) {
      if (prEntriesArr[i].projectId === projectId) {
        index = i;
      }
    }
    return sheet.projectEntriesArray[index].next;
  },

  issues: function (projectId) {
    var date = Session.get('startDate');
    var user = Meteor.userId();
    if (Session.get('search_employee')) {
      user = Session.get('search_employee');
    }
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    var prEntriesArr = sheet.projectEntriesArray;

    var index = 0;

    for (var i = 0; i < prEntriesArr.length; i++) {
      if (prEntriesArr[i].projectId === projectId) {
        index = i;
      }
    }

    return sheet.projectEntriesArray[index].issues;
  },

  message: function (projectId) {
    var date = Session.get('startDate');
    var user = Meteor.userId();
    if (Session.get('search_employee')) {
      user = Session.get('search_employee');
    }
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    var prEntriesArr = sheet.projectEntriesArray;

    var index = 0;

    for (var i = 0; i < prEntriesArr.length; i++) {
      if (prEntriesArr[i].projectId === projectId) {
        index = i;
      }
    }

    return sheet.projectEntriesArray[index].rejectMessage;
  }
});

Template.historyLastSection.helpers({
  genComment: function () {
    var date = Session.get('startDate');
    var user = Meteor.userId();
    if (Session.get('search_employee')) {
      user = Session.get('search_employee');
    }
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    if (sheet.submitted) {
      $('#generalComment').attr('disabled', 'disabled');
    }

    return sheet.generalComment;
  },

  concerns: function () {
    var date = Session.get('startDate');
    var user = Meteor.userId();
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    if (sheet.submitted) {
      $('#concerns').attr('disabled', 'disabled');
    }

    return sheet.concerns;
  }
});

Template.historyLog.helpers({
  revisions: function () {
    var revisionArray = [];
    var date = Session.get('startDate');
    var user = Meteor.userId();
    if (Session.get('search_employee')) {
      user = Session.get('search_employee');
    }
    var revisions = TimeSheet.findOne({
      'startDate': date,
      'userId': user
    }).revision;
    revisions.forEach(function (r) {
      var timestamp = r.timestamp.getDate() + '/' +
          (r.timestamp.getMonth() + 1) + '/' +
          r.timestamp.getFullYear() + ' @ ' +
          r.timestamp.getHours() + ':' +
          r.timestamp.getMinutes();

      var message = '';
      if (r.type === 'approval') {
        message = r.manager + ' approved ' + r.totalHours + ' hours for project ' + r.project + '.';
      } else if (r.type === 'rejection') {
        message = r.manager + ' rejected ' + r.totalHours + ' hours for project ' + r.project + ' with message \"' + r.comment + '\".';
      } else if (r.type === 'submission') {
        message = r.employee + ' submitted ' + r.totalHours + ' hours for project ' + r.project + '.';
      }

      revisionArray.push({
        'timestamp': timestamp,
        'message': message
      });
    });
    return revisionArray;
  }
});

Template.historyEmployeeSelect.events({
  'click button': function (event, template) {
    var employee = document.getElementById('defaultemployee').value;

    var employeeID = '';
    var employees = Meteor.users.find({'username': employee});

    employees.forEach(function (e) {
      employeeID = e._id;
    });

    var project = document.getElementById('defaultproject').value;
    console.log()
    var projectId = '';
    if(project != ''){
       var projects = ChargeNumbers.find({'name': project});
       projects.forEach(function (p) {
        projectId = p.name;
     });
    }

    var user = Meteor.user();

    if (user.admin) {
      Session.set('search_employee', employeeID);
    } else if (user.manager) {
      var subordinates = ActiveDBService.getEmployeesUnderManager();
      if (subordinates.indexOf(employeeID) !== -1) {
        Session.set('search_employee', employeeID);
      } else {
        Session.set('search_employee', '');
      }
    }
    console.log(projectId);
    Session.set('search_project', projectId);
    console.log(Session.get('search_project'));
    Session.set('current_page', 'historical_page');
  },
  'click #showall': function (event, template){
    console.log("showall");
  }
});

Template.historyEmployeeSelect.rendered = function () {
  Meteor.typeahead.inject();

};

Template.historyEmployeeSelect.helpers({
   auto_projects: function () {
    'use strict';
    var toReturn = [];
    var person = Meteor.user();
    if (person === null || (!person.manager && !person.admin)) {
      return;
    }

    if (person.admin) {
       ChargeNumbers.find().fetch().map(function (cn) {
        toReturn.push({
          name: cn.name,
          text: cn.name
        });
      });
    } else{
      ChargeNumbers.find({'manager': {$in: person.groups}}).fetch().map(function (cn) {
        toReturn.push({
            name: cn.name,
            text: cn.name
          });
      });
  }
  return toReturn;
  },

  auto_employees: function () {
    var toReturn = [];
    Meteor.users.find().fetch().map(function (emp) {
        toReturn.push({
          name: emp.username,
          text: emp.username
        });
    });
    return toReturn;
  }
});

Template.historical_totals.helpers({
  getDayTotal: function (day) {
    var date = Session.get('startDate');
    var user = Meteor.userId();
    var data = Session.get('editing-user-page');
    var total = 0;
    if (data) {
      var userO = Meteor.users.findOne({username: data.username});
      if (userO) {
        user = userO._id;
      }
    }
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    if (!sheet) {
      return;
    }

    var projectEntries = sheet.projectEntriesArray;
    for (var i = 0; i < projectEntries.length; i++) {
      var EntryArray = projectEntries[i].EntryArray;

      for (var j = 0; j < EntryArray.length; j++) {
        var hours = EntryArray[j].hours;
        total += parseFloat(hours[day]) || 0;
      }
    }
    return total;
  },

  getWeekTotal: function () {
    var date = Session.get('startDate');
    var user = Meteor.userId();
    var data = Session.get('editing-user-page');
    var total = 0;
    if (data) {
      var userO = Meteor.users.findOne({username: data.username});
      if (userO) {
        user = userO._id;
      }
    }
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    if (!sheet) {
      return;
    }

    var projectEntries = sheet.projectEntriesArray;
    for (var i = 0; i < projectEntries.length; i++) {
      var EntryArray = projectEntries[i].EntryArray;

      for (var j = 0; j < EntryArray.length; j++) {
        var hours = EntryArray[j].hours;
        for (var k = 0; k < hours.length; k++) {
          total += parseFloat(hours[k]) || 0;
        }
      }
    }

    return total;
  }
});

var containsInArray = function(item, array){
    for(var i =0; i<array.length;i++){
      if(item === array[i]){
        return true;
      }
    }
    return false;
}
})();
