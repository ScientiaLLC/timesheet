/**
 * Created by sternetj on 12/7/14.
 */
Session.set('current_project_to_approve', 'none');
Session.set('current_user', 'admin');

Session.set('showZeroHours',false);
var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Next Week Goals",
  "Issues", "Concerns", "General Comment"];

Meteor.call('getCurrentWeekObject',
    function (error, result) {
      if (error) {
        console.log(error);
      }

      var d = new Date(result.start);
      d.setDate(d.getDate() - 7);
      Session.set('startDate', d.toISOString());
    });

//Methods for the rows that show which users need their timesheets approved
Template.toApprove_Template.helpers({
  toApprove: function () {
    var selected = Session.get('current_project_to_approve');
    var totals = {};
    var hasSubmitted = {};

    var zeroEntry = [];
    var userIdToSubmit = [];
    var total = 0;
    var startDateStr = Session.get("startDate");
    var startDate = new Date(startDateStr);
    //get timesheets for the selected startdate
    var timesheets = TimeSheet.find({
      'startDate': startDate.toLocaleDateString()
    });

    var toReturn = [];

    timesheets.forEach(function (t) {
      // console.log(t);
      var pApprovals = {};
      for (var i in t.projectApprovalArray) {
        pApprovals[t.projectApprovalArray[i].projectId] = t.projectApprovalArray[i].approved;
      }

      t.projectEntriesArray.forEach(function (pe) {
        if (pe.projectId == selected && (!pApprovals[pe.projectId] || Session.get('showAll'))) {
          pe.EntryArray.forEach(function (a) {
            for (var b in a.hours) {
              total += parseFloat(a.hours[b]);
              // console.log("total " +total);
            }
            if(total === 0 ){
              zeroEntry.push(pe.projectId);
            }
          });
        }

        var rejected = false;
        t.projectApprovalArray.forEach(function (paa) {
          if (paa.projectId == selected) {
            show = (!paa.approved || Session.get('showAll'));
            rejected = paa.sentBack;
          }
        });

        //Meteor.users.findOne({_id: t.userId, projects: {$in : [selected]}}) &&
        if (show) {
          if (!totals[t.userId]) {
            totals[t.userId] = {
              total: 0,
              sentBack: rejected,
              approved: !show
            };
          }
          if(!containsInArray(pe.projectId,zeroEntry) || Session.get('showZeroHours')){
            
            totals[t.userId] =
            {
              total: totals[t.userId].total + total,
              sentBack: totals[t.userId].sentBack || (rejected && pe.projectId == selected) || !t.submitted,
              approved: totals[t.userId].approved || (pApprovals[pe.projectId] && pe.projectId == selected)
            };
            // console.log(totals[t.userId].total);
          }
        }
        total =0;
      });
      hasSubmitted[t.userId] = t.submitted;
      if (totals[t.userId] == null) {
        var show = true;
        t.projectApprovalArray.forEach(function (paa) {
          if (paa.projectId == selected) {
            show = (!paa.approved || Session.get('showAll'));
          }
        });
        if (Meteor.users.findOne({
              _id: t.userId,
              projects: {$in: [selected]}
            }) && show) {
          totals[t.userId] = {
            total: 0,
            sentBack: !t.submitted,
            approved: !show
          };
        }
      }
    });
    for (var key in totals) {
      if (totals.hasOwnProperty(key) && (!totals[key].approved || Session.get('showAll'))) {
        var u = Meteor.users.findOne({_id: key});
        if(totals[key].total != 0 || Session.get('showZeroHours')){
          toReturn.push({
            selected: '',
            submitted: hasSubmitted[key],
            sentBack: totals[key].sentBack,
            username: u.username,
            total: totals[key].total,
            color2: totals[key].approved ? "color:#5CB85C" : ""
          });
        }
      }
    }

    var compare = function (a, b) {
      if (a.submitted > b.submitted) {
        return -1;
      } else if (a.submitted == b.submitted) {
        if (a.sentBack > b.sentBack) {
          return 1;
        } else if (a.sentBack < b.sentBack) {
          return -1;
        } else {
          return 0;
        }
      }

      return 1;
    };

    toReturn = toReturn.sort(compare);

    if (toReturn[0]) {
      toReturn[0].selected = 'selected';
      Session.set('current_user_to_approve', toReturn[0].username);
    }
    return toReturn;
  }
});
Template.toApprove_Users.helpers({
  showUserHours: function(){
    var selected = Session.get('current_user');
    var projectId = '';
    // console.log("selected"+selected);
    var totals = {};
    var hasSubmitted = {};
    var userID = Meteor.users.findOne({'username': selected})._id;
    // console.log(userId);
    var total = 0;
    var projectHoursArray = [];
    var startDateStr = Session.get("startDate");
    var startDate = new Date(startDateStr);
    //get timesheets for the selected startdate
    var timesheets = TimeSheet.find({
      'startDate': startDate.toLocaleDateString()
    });

    var toReturn = [];

    timesheets.forEach(function (t) {
      var pApprovals = {};
      // console.log(t);
        // var usernameId = t
        for (var i in t.projectApprovalArray) {
          pApprovals[t.projectApprovalArray[i].projectId] = t.projectApprovalArray[i].approved;
        }


      t.projectEntriesArray.forEach(function (pe) {
        projectId = pe.projectId;
        // console.log("pe");
        // console.log(pe);
        // console.log("projectID "+projectId);
        if (!pApprovals[pe.projectId]) {
         Session.set('current_user_project_to_approve', pe.projectId);
          pe.EntryArray.forEach(function (a) {

            for (var b in a.hours) {
              total += parseFloat(a.hours[b]);
            }
          });
        }

        var rejected = false;
        t.projectApprovalArray.forEach(function (paa) {
            if (paa.projectId == projectId) {
            show = (!paa.approved || Session.get('showAll'));
            rejected = paa.sentBack;
          }
        });

        if (show) {
          if (!totals[projectId]) {
            totals[projectId] = {
              total: 0,
              sentBack: rejected,
              approved: !show
            };
          }
          if(userID === t.userId){
          totals[projectId] =
          {
            total: totals[projectId].total + total,
            sentBack: totals[projectId].sentBack || (rejected || !t.submitted),
            approved: totals[projectId].approved || (pApprovals[pe.projectId])
          };
        }
      }
        if(userID === t.userId){
          projectHoursArray.push(projectId);
        }
        total =0;
        
      });
      // console.log(projectHoursArray);
      hasSubmitted[t.userId] = t.submitted;
      if (totals[t.userId] == null) {
        var show = true;
        t.projectApprovalArray.forEach(function (paa) {
          if (paa.projectId == selected) {
            show = (!paa.approved || Session.get('showAll'));
          }
        });
        if (Meteor.users.findOne({
              _id: userID,
              projects: {$in: [projectId]}
            }) && show) {
          totals[t.userId] = {
            total: 0,
            sentBack: !t.submitted,
            approved: !show
          };
        }
      }
    });
  // console.log(totals);
    for (var key in totals) {
      if (totals.hasOwnProperty(key) && (!totals[key].approved || Session.get('showAll'))) {
        var u = Meteor.users.findOne({_id: userID});
          if(containsInArray(key,projectHoursArray)){
            toReturn.push({
              selected: 'selected',
              submitted: hasSubmitted[key],
              sentBack: totals[key].sentBack,
              username: ChargeNumbers.findOne({'_id': key}).name,
              total: totals[key].total,
              color2: totals[key].approved ? "color:#5CB85C" : ""
            });
          }
        }
      }

    var compare = function (a, b) {
      if (a.submitted > b.submitted) {
        return -1;
      } else if (a.submitted == b.submitted) {
        if (a.sentBack > b.sentBack) {
          return 1;
        } else if (a.sentBack < b.sentBack) {
          return -1;
        } else {
          return 0;
        }
      }

      return 1;
    };

    toReturn = toReturn.sort(compare);

    // if (toReturn[0]) {
    //   toReturn[0].selected = 'selected';
    //   Session.set('current_user', toReturn[0].username);
    // }
    // console.log("toReturn");
    // console.log(toReturn);
    return toReturn;
  },
});

Template.toApprove_Template.events({
  'click .approve': function (e) {
    if (!e.target.parentNode.parentNode.classList.contains('selected')) return;

    var row = e.currentTarget.parentNode.parentNode;
    ApprovalService.removeErrorClass(row, '#rejectComment');

    var startDateStr = Session.get("startDate");
    var date = (new Date(startDateStr)).toLocaleDateString();

    var userId = Meteor.users.findOne({username: Session.get('current_user_to_approve')})._id;

    var projectId = Session.get('current_project_to_approve');
    var projectName = ChargeNumbers.findOne({'_id': projectId}).name;

    var sheet = TimeSheet.findOne({
      'startDate': date,
      'userId': userId,
      'submitted': true
    });
    var totalHours = ActiveDBService.getTotalHoursForProject(sheet, projectId);

    var managerName = Meteor.users.findOne({'_id': Session.get('LdapId')}).username;

    var revision = sheet.revision;

    Meteor.call('updateApprovalStatusInTimeSheet', date, userId, projectId, true, 'Approved');

    revision.unshift({
      'manager': managerName,
      'project': projectName,
      'timestamp': new Date(),
      'totalHours': totalHours,
      'type': 'approval'
    });

    Meteor.call('updateActiveStatusInTimesheetRevision', date, userId, revision);


  },
  'click .reject': function (e, t) {
    if (!e.target.parentNode.parentNode.classList.contains("selected")) {
      return;
    }

    console.log('rejecting');

    var startDateStr = Session.get("startDate");
    var date = (new Date(startDateStr)).toLocaleDateString();

    var userId = Meteor.users.findOne({username: Session.get('current_user_to_approve')})._id;

    var projectId = Session.get('current_project_to_approve');
    var projectName = ChargeNumbers.findOne({'_id': projectId}).name;

    var rejectComment = $(e.target.parentNode.parentNode).find('#rejectComment')[0].value;
    var row = e.currentTarget.parentNode.parentNode;
    ApprovalService.removeErrorClass(row, '#rejectComment');
    if (rejectComment == "") {
      ApprovalService.addError(row, '#rejectComment', "Description is Required");
      return;
    }
    ;

    $(e.target.parentNode.parentNode).find('#rejectComment')[0].value = '';

    var sheet = TimeSheet.findOne({
      'startDate': date,
      'userId': userId,
      'submitted': true
    });
    var totalHours = ActiveDBService.getTotalHoursForProject(sheet, projectId);

    var managerName = Meteor.users.findOne({'_id': Session.get('LdapId')}).username;

    var revision = sheet.revision;

    console.log("reject");

    revision.unshift({
      'manager': managerName,
      'project': projectName,
      'timestamp': new Date(),
      'totalHours': totalHours,
      'type': 'rejection',
      'comment': rejectComment
    });

    Meteor.call('updateApprovalStatusInTimeSheet', date, userId, projectId, false, rejectComment, revision);
  }
});

ApprovalService = {
  addError: function (row, selector, message) {
    $(row).find(selector).parent().addClass('has-error');
    $(row).find(selector).tooltip({
      title: message,
      trigger: 'hover',
      animation: false
    });
    $(row).find(selector).tooltip('show');
  },
  removeErrorClass: function (row, selector) {

    var item = $(row).find(selector);
    item.parent().removeClass('has-error');
    item.tooltip('destroy');
  }
};

Template.approval_Template.helpers({
  Active: function () {
    // var user = Session.get('current_user');
    var username = Session.get('current_user_to_approve');
    var startDate = new Date(Session.get("startDate"));

    if (!username) {
      return false;
    }
    var userId = Meteor.users.findOne({username: username})._id;
    var sheet = TimeSheet.findOne({
      'startDate': startDate.toLocaleDateString(),
      'userId': userId
    });
    return (sheet.active == 1);

  },
  Active_user: function () {
    var username = Session.get('current_user');
    var projectName = Session.get('current_user_project_to_approve');

    var startDate = new Date(Session.get("startDate"));
    if (!username) {
      return false;
    }
    var userId = Meteor.users.findOne({username: username})._id;
    var sheet = TimeSheet.findOne({
      'startDate': startDate.toLocaleDateString(),
      'userId': userId
    });
    return (sheet.active == 1);

  },
  needsApproving: function () {
    var selected = Session.get('current_project_to_approve');
    var startDate = new Date(Session.get("startDate"));
    var showAll = Session.get("showAll");
    var result = false;
    TimeSheet.find({
      'startDate': startDate.toLocaleDateString()
    }).forEach(function (t) {
      if (!result) {
        t.projectApprovalArray.forEach(function (pe) {
          if (pe.projectId == selected && (!pe.approved || showAll)) {
            result = true;
            return result;
          }
        });
      }
    });
    return result;
  },
  'managedProjects': function () {
    "use strict";
    var user = Meteor.users.findOne({'_id': Session.get('LdapId')});
    if (!user || (!user.manager && !user.admin)) {
      return;
    }
    var toReturn = [];

    var id = null;
    if (user.admin) {
      id = ChargeNumbers.findOne()._id;
      // console.log(Session.get('current_project_to_approve'));
      Session.set('current_project_to_approve', id);
       // console.log(Session.get('current_project_to_approve'));
      ChargeNumbers.find({}).forEach(function (cn) {
        if (cn.indirect) {
          toReturn.push({
            charge_number: cn._id,
            text: 'Indirect   ( ' + cn.name + ' )'
          });
        } else {
          toReturn.push({
            charge_number: cn._id,
            text: cn.id + '   ( ' + cn.name + ' )'
          });
        }
      });
    } else {
      //user is a manager
      ChargeNumbers.find({'manager': {$in: user.groups}}).forEach(function (cn) {
        if (id == null) {
          id = cn._id;
        }
        if (cn.indirect) {
          toReturn.push({
            charge_number: cn._id,
            text: 'Indirect   ( ' + cn.name + ' )'
          });
        } else {
          toReturn.push({
            charge_number: cn._id,
            text: cn.id + '   ( ' + cn.name + ' )'
          });
        }
      });
    }

    Session.set('current_project_to_approve', id);

    toReturn.sort(function (a, b) {
      var textA = a.text.toUpperCase();
      var textB = b.text.toUpperCase();
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });

    if (toReturn.length > 0) {
      Session.set('current_project_to_approve', toReturn[0].charge_number);
    }

    return toReturn;
  },
  'managedUser': function(){
    var toReturn = []; 
    Meteor.users.find().fetch().map(function (emp) {
        toReturn.push({
          name: emp.username,
          text: emp.username
        });
    });
    return toReturn;
  },
  isActive: function (date) {
    "use strict";
    return ProjectService.isActive(date);
  },
  userTimesheet: function () {
    var chargeNumber_id = Session.get('current_project_to_approve');
    var username = Session.get('current_user_to_approve');
    if (!username) return;
    // var userId = Meteor.users.findOne({'username': username})._id;

    var startDateStr = Session.get("startDate");
    var startDate = new Date(startDateStr);
    var timesheets = TimeSheet.find({
      'userId': Meteor.users.findOne({'username': username})._id,
      'startDate': startDate.toLocaleDateString()
    });

    var toReturn = [];

    timesheets.forEach(function (t) {
      var pApprovals = {};
      for (var i in t.projectApprovalArray) {
        pApprovals[t.projectApprovalArray[i].projectId] = t.projectApprovalArray[i].approved;
      }

      t.projectEntriesArray.forEach(function (pe) {
        if (pe.projectId === chargeNumber_id && (!pApprovals[pe.projectId] || Session.get('showAll'))) {
          pe.EntryArray.forEach(function (a) {
            for (var b in a.hours) {
              if (!toReturn[b]) {
                toReturn[b] = {
                  day: days[b],
                  hours: parseFloat(a.hours[b]),
                  comment: [{com: a.hours[b] > 0 ? a.Comment : ""}]
                }
                continue;
              }
              if (a.hours[b] > 0) {
                toReturn[b].comment.push({com: a.Comment});
                toReturn[b] = {
                  day: toReturn[b].day,
                  hours: toReturn[b].hours + parseFloat(a.hours[b]),
                  comment: toReturn[b].comment
                };
              }
            }
          });
          toReturn[7] = {
            day: "Next Week Goals",
            hours: "",
            comment: [{com: pe.next}]
          }
          toReturn[8] = {
            day: "Issues",
            hours: "",
            comment: [{com: pe.issues}]
          };
          toReturn[9] = {
            day: "Concerns",
            hours: "",
            comment: [{com: t.concerns}]
          };
          toReturn[10] = {
            day: "General Comment",
            hours: "",
            comment: [{com: t.generalComment}]
          };
        }
      });
      if (toReturn.length === 0) {
        for (var i = 0; i < 11; i++) {
          toReturn[i] = {
            day: days[i],
            hours: (i > 6 ? '' : 0),
            comment: ''
          };
        }
      }
    });

    return toReturn;
  },
  userSearchTimesheet: function () {
    var chargeNumber_name = Session.get('current_user_project_to_approve');
    var chargeNumber_id = ChargeNumbers.findOne({'name': chargeNumber_name})._id;
    // Session.set('current_user_project_to_approve', chargeNumber_id);
    var username = Session.get('current_user');
    if (!username) return;
    // var userId = Meteor.users.findOne({'username': username})._id;

    var startDateStr = Session.get("startDate");
    var startDate = new Date(startDateStr);
    var timesheets = TimeSheet.find({
      'userId': Meteor.users.findOne({'username': username})._id,
      'startDate': startDate.toLocaleDateString()
    });

    var toReturn = [];

    timesheets.forEach(function (t) {
      var pApprovals = {};
      for (var i in t.projectApprovalArray) {
        pApprovals[t.projectApprovalArray[i].projectId] = t.projectApprovalArray[i].approved;
      }

      t.projectEntriesArray.forEach(function (pe) {
        if (pe.projectId === chargeNumber_id && (!pApprovals[pe.projectId] || Session.get('showAll'))) {
          pe.EntryArray.forEach(function (a) {
            for (var b in a.hours) {
              if (!toReturn[b]) {
                toReturn[b] = {
                  day: days[b],
                  hours: parseFloat(a.hours[b]),
                  comment: [{com: a.hours[b] > 0 ? a.Comment : ""}]
                }
                continue;
              }
              if (a.hours[b] > 0) {
                toReturn[b].comment.push({com: a.Comment});
                toReturn[b] = {
                  day: toReturn[b].day,
                  hours: toReturn[b].hours + parseFloat(a.hours[b]),
                  comment: toReturn[b].comment
                };
              }
            }
          });
          toReturn[7] = {
            day: "Next Week Goals",
            hours: "",
            comment: [{com: pe.next}]
          }
          toReturn[8] = {
            day: "Issues",
            hours: "",
            comment: [{com: pe.issues}]
          };
          toReturn[9] = {
            day: "Concerns",
            hours: "",
            comment: [{com: t.concerns}]
          };
          toReturn[10] = {
            day: "General Comment",
            hours: "",
            comment: [{com: t.generalComment}]
          };
        }
      });
      if (toReturn.length === 0) {
        for (var i = 0; i < 11; i++) {
          toReturn[i] = {
            day: days[i],
            hours: (i > 6 ? '' : 0),
            comment: ''
          };
        }
      }
    });

    return toReturn;
  },
  isAdmin: function () {
    var user = Meteor.users.findOne({'_id': Session.get('LdapId')});
    if (user && user.admin) {
      return true;
    } else {
      return false;
    }
  }
});

Template.approval_Template.events({
  'onload #timesheet_approvals': function (e) {
    lastSelection = document.getElementById("timesheet_approvals");
    // console.log(lastSelection);
  },
  'change [type=current-project-checkbox]': function (e, t) {
    "use strict";
    var str = e.target.options[e.target.selectedIndex].value;
    Session.set('current_project_to_approve', str);
    Session.set('current_user_to_approve', null);
    var lastSelection = document.getElementsByClassName("selected toApprove-Rows")[0];
    if (lastSelection) {
      lastSelection.classList.remove("selected");
    }
    lastSelection = document.getElementsByClassName("toApprove-Rows")[0];
    if (lastSelection) {
      lastSelection.classList.add("selected");
    }
  },
  'change [type=current-user-checkbox]': function(e,t){
    "use strict";
    var str = e.target.options[e.target.selectedIndex].value;
    // console.log(str);
    Session.set('current_user', str);

  },
  'click .row-item': function (e, t) {
    // console.log(e);
    lastSelection = document.getElementsByClassName("selected toApprove-Rows")[0];
    // console.log(lastSelection);
    if (lastSelection) {
      lastSelection.classList.remove("selected");
    }

    var lastSelection = e.target;
    while (lastSelection && !lastSelection.classList.contains("row-item")) {
      lastSelection = lastSelection.parentNode;
    }
    lastSelection.classList.add("selected");
    // console.log(lastSelection.childNodes[2].id);
    if (lastSelection.childNodes[2].id === 'username') {
      Session.set('current_user_to_approve', lastSelection.childNodes[2].firstChild.textContent);
    } else if(lastSelection.childNodes[2].id === ''){
      // sometimes the passes in tag is null when it should be username.
      Session.set('current_user_to_approve', lastSelection.childNodes[2].childNodes[1].childNodes[3].childNodes[1].textContent);
    }else if(lastSelection.childNodes[2].id === 'project'){
      // Session.set('current_user_to_approve', lastSelection.childNodes[2].childNodes[1].childNodes[3].childNodes[1].textContent);
      Session.set('current_user_project_to_approve', lastSelection.childNodes[2].firstChild.textContent);
    } 

  },
  'click .edit-sheet': function () {
    var username = Session.get('current_user_to_approve');
    if (!username) {
      return;
    }

    var data = {
      'username': username,
      'project': Session.get('current_project_to_approve')
    }


    Session.set('current_page', 'selected_timesheet');
    var d = new Date(Session.get("startDate"));
    Session.set('startDate', d.toLocaleDateString());
    Session.set('editing-user-page', data);
  },
  'click #showbtn': function (e) {
    if (Session.get('showAll') == null) {
      Session.set('showAll', false);
      e.target.innerHTML = "Hide Approved Time";
    }
    Session.set('showAll', !Session.get('showAll'));

    if (Session.get('showAll')) {
      e.target.innerHTML = "Hide Approved Time";
    } else {
      e.target.innerHTML = "Show Approved Time";
    }
  },
  'click #showAll': function (e) {
    if (Session.get('showZeroHours') == null) {
      Session.set('showZeroHours', false);
      e.target.innerHTML = "Hide Zero Hours";
    }
    Session.set('showZeroHours', !Session.get('showZeroHours'));

    if (Session.get('showZeroHours')) {
      e.target.innerHTML = "Hide Zero Hours";
    } else {
      e.target.innerHTML = "Show Zero Hours";
    }
  }
  
});

Template.date_picker.helpers({
  currentDateRange: function () {
    var startDate = new Date(Session.get("startDate"));
    if (!startDate) {
      return;
    }

    var d2 = new Date(startDate);
    d2.setDate(d2.getDate() + 6);
    var endDate = d2.toLocaleDateString();

    Session.set("startDate", startDate.toISOString());
    var startDateStr = startDate.toLocaleDateString();

    return startDateStr + " - " + endDate;
  }
});

Template.date_picker.events({
  'click .prevWeek': function () {
    var startDate = Session.get("startDate");

    var d2 = new Date(startDate);
    d2.setDate(d2.getDate() - 7);

    Session.set("startDate", d2.toISOString());
  },
  'click .nextWeek': function () {
    var startDate = Session.get("startDate");

    var d2 = new Date(startDate);
    d2.setDate(d2.getDate() + 7);

    //don't advance past current week
    Meteor.call('getCurrentWeekObject',
        function (error, result) {
          if (error) {
            console.log(error);
          }

          if (d2 > result.start) {
            return;
          }

          Session.set("startDate", d2.toISOString());
        });
    //return;
    ////if (d2 > dObj.start) {
    ////    return;
    ////}
    //
    //Session.set("startDate", d2.toISOString());
  }
})
var containsInArray = function(item, array){
    for(var i =0; i<array.length;i++){
      if(item === array[i]){
        return true;
      }
    }
    return false;
}