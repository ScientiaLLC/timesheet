Meteor.startup(function () {

    process.env.MAIL_URL = 'smtp://noreply.scientiallc.timesheet%40gmail.com:N1esZd02FBi06WW@smtp.gmail.com:587/';

    
    function setupMissingTimesheets() {
        /*
            Adds any missing timesheets for the current week
        */
        var d = new Date(),
            d2 = new Date();
        d.setDate((d.getDate() - (d.getDay() + 6) % 7) - 1);
        d2.setDate((d2.getDate() - (d2.getDay() + 6) % 7) + 6);

        var dStr = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(),
            d2Str = (d2.getMonth() + 1) + '/' + d2.getDate() + '/' + d2.getFullYear();

        Meteor.users.find({}).forEach(
            function (user) {
                //Small Change (changed uppercase D to d in userId) here to see if this works
                if (TimeSheet.find({'startDate': dStr, 'userId': user['_id']}).count() == 0) {
                    TimeSheet.insert(
                        {
                            'startDate': dStr,
                            'endDate': d2Str,
                            'userId': user['_id'],
                            'active': 1,
                            'revision': [],
                            'projectEntriesArray': [],
                            'type': 1,
                            'generalComment': '',
                            'concerns': '',
                            'submitted': false
                        }
                    );
                }
            }
        );
    }

    setupMissingTimesheets();

    function setupWeeklyTimesheetAdder() {
        /*
            Create weekly timesheet adder job
        */
        SyncedCron.add({
            name: 'setup weekly timesheets',
            schedule: function (parser) {
                // parser is a later.parse object
                return parser.text('at 00:00 on Saturday');
            },
            job: function () {
                var d = new Date(),
                    d2 = new Date();
                d.setDate((d.getDate() - (d.getDay() + 6) % 7) - 1);
                d2.setDate((d2.getDate() - (d2.getDay() + 6) % 7) + 6);
                var dStr = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(),
                    d2Str = (d2.getMonth() + 1) + '/' + d2.getDate() + '/' + d2.getFullYear();

                Meteor.users.find({}).forEach(
                    function (user) {
                        TimeSheet.insert(
                            {
                                'startDate': dStr,
                                'endDate': d2Str,
                                'userId': user['_id'],
                                'active': 1,
                                'revision': [],
                                'projectEntriesArray': [],
                                'type': 1,
                                'generalComment': '',
                                'concerns': '',
                                'submitted': false
                            }
                        );
                    }
                );
            }
        });
    }

    Meteor.methods({
        sendEmail: function (to, subject, body) {
            /*
                Send the Email
            */
            Email.send({
                bcc: to, from: 'noreply.scientiallc.timesheet@gmail.com',
                html: body,
                subject: subject
            });
        },
        scheduleJob: function (job) {
            console.log('on server, Scheduling Job');
            console.log(job.type);
            console.log(job.details.schedule_text);
            switch (job.type) {
                case 'email':
                    SyncedCron.add({
                        name: job.type + 'job: ' + job._id,
                        schedule: function (parser) {
                            // parser is a later.parse object
                            return parser.text(job.details.schedule_text);
                        },
                        job: function () {
                            var d = new Date();
                            d.setDate((d.getDate() - (d.getDay() + 6) % 7) - 1);
                            var dStr = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();

                            var toRemind = [];
                            TimeSheet.find({startDate: dStr, submitted: false}).forEach(function (sheet) {
                                toRemind.push({_id: sheet.userId});
                            });

                            toSendEmail = [];
                            Meteor.users.find({$or: toRemind}).map(function (u) {
                                toSendEmail.push(u.email);
                            });
                            Meteor.call('sendEmail', toSendEmail, 'Please Submit Your Timesheet', EmailTemplates.getReminderEmail());
                        }
                    });
                    break;
            }
            SyncedCron.start();
        },
        deleteJob: function (job) {
            SyncedCron.remove(job.type + 'job: ' + job._id);
        }
    });

    setupWeeklyTimesheetAdder();

    function scheduleReminders() {
        Jobs.find({}).forEach(function (job) {
            Meteor.call('scheduleJob', job);
        });
    }

    scheduleReminders();

    //start all jobs
    SyncedCron.start();
});
