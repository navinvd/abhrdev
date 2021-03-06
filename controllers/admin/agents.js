var express = require('express');
var router = express.Router();
var config = require('./../../config');
var User = require('./../../models/users');
var Place = require('./../../models/places');
var CarBooking = require('./../../models/car_booking');
var Users = require('./../../models/users');
var path = require('path');
var async = require("async");
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
var moment = require('moment');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var _ = require('underscore');
var mailHelper = require('./../../helper/mail');
var generator = require('generate-password');


/**
 * @api {post} /admin/agents/add create new agent
 * @apiName Create Agent
 * @apiDescription This is for add new agent from super admin
 * @apiGroup Admin - Agents
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} first_name FirstName
 * @apiParam {String} last_name LastName
 * @apiParam {String} phone_number User User Phone Number 
 * @apiParam {String} email User email address 
 * @apiParam {String} deviceType device_type of application type ["ios", "anroid"]
 * @apiParam {String} address google autocomplete address (optional)
 * 
 * @apiHeader {String}  Content-Type application/json   
 * @apiHeader {String}  x-access-token Admin unique access-key  
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/add', async (req, res, next) => {
    var schema = {
        'first_name': {
            notEmpty: true,
            errorMessage: "FirstName is required"
        },
        'last_name': {
            notEmpty: true,
            errorMessage: "LastName is required"
        },
        'email': {
            notEmpty: true,
            errorMessage: "Email is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var generatepassword = generator.generate({
            length: 10,
            numbers: true
        });
        var userData = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            phone_number: req.body.phone_number ? req.body.phone_number : null,
            country_code: req.body.country_code ? req.body.country_code : null,
            email: req.body.email,
            type: "agent",
            deviceType: 'android',
            password: generatepassword
        };

        // var superAdminData = await Users.find({ 'type': 'admin', isDeleted: false }).lean().exec();

        if (req.body.phone_number && req.body.phone_number !== null && typeof req.body.phone_number !== 'undefined') {
            userData = Object.assign(userData, { "phone_number_verified": 2 });
        }
        try {
            async.waterfall([
                function (callback) {
                    console.log('1. first callback');
                    var email = 0;
                    User.find({ "email": req.body.email, "isDeleted": false }, function (err, data) {
                        if (data && data.length > 0) {
                            email = 1;
                            callback({ message: "Email is already exist", email: email });
                        }
                        else {
                            // callback(null);
                            callback(null, { "email": email });
                        }
                        if (err) {
                            console.log('Error====>', err);
                            callback(err);
                        }
                    });
                },
                function (error1, callback) {
                    console.log('\n\n\n\2. second callback', error1, '\n\n\n\ callback', callback);
                    var phone_number = 0;
                    if (req.body.phone_number) {
                        User.find({ "phone_number": req.body.phone_number, "isDeleted": false }, function (err, data) {
                            if (data && data.length > 0) {
                                phone_number = 1;
                                callback({ message: "phone_number is already exist", phone_number: phone_number, email: error1.email });
                            }
                            else {
                                // callback(null);
                                callback(null, { "phone_number": phone_number, email: error1.email });
                            }
                            if (err) {
                                console.log('Error====>', err);
                                callback(err);
                            }
                        });
                    } else {
                        callback(null, { "phone_number": phone_number, email: error1.email });
                    }
                },
                function (error1, callback) {
                    console.log('error1=====>', error1);
                    if (error1.email === 0 && error1.phone_number === 0) {
                        console.log('userData========>', userData);
                        var userModel = new User(userData);
                        userModel.save(async function (err, data) {
                            console.log('err========>', err, 'data====>', data);
                            if (err) {
                                callback(err);
                            } else {

                                var superAdminData = await User.find({ 'type': 'admin', isDeleted: false }).lean().exec();
                                console.log('superAdminData----->', superAdminData);
                                var result = {
                                    message: "Agent added successfully..",
                                    data: userData
                                };
                                var option = {
                                    to: userData.email,
                                    subject: 'ABHR - Agent Account Notification'
                                }
                                var data = {
                                    first_name: userData.first_name,
                                    last_name: userData.last_name,
                                    email: userData.email,
                                    password: generatepassword,
                                    support_country_code: superAdminData[0].support_country_code,
                                    support_email: superAdminData[0].support_email,
                                    support_phone_number: superAdminData[0].support_phone_number
                                }


                                mailHelper.send('/agents/add_agent', option, data, function (err, res) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        // callback(null, null);
                                        callback(null, result);
                                    }
                                })
                            }
                        });
                    }
                    else {
                        callback(error1);
                    }
                }], function (err, result) {
                    console.log('err===>', err, "result====>", result);
                    if (err) {
                        return next(err);
                    } else {
                        res.status(config.OK_STATUS).json(result);
                    }
                });
        } catch (e) {
            res.status(config.BAD_REQUEST).json({
                message: "Something Went wrong",
                error: e
            });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/**
 * @api {put} /admin/agents/update update Agent details
 * @apiName Update Agent
 * @apiDescription Used to update agent information
 * @apiGroup Admin - Agents
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id User Id
 * @apiParam {String} first_name FirstName
 * @apiParam {String} last_name LastName
 * @apiParam {String} username Unique Username
 * @apiParam {String} phone_number User User Phone Number 
 * @apiParam {String} email User email address 
 * @apiParam {String} address google autocomplete address (optional)
 * @apiParam {String} deviceType device_type of application type ["ios", "anroid"]
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Admin unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/update', (req, res, next) => {
    console.log(req.body);
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "user_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var userData = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            phone_number: req.body.phone_number ? req.body.phone_number : null,
            country_code: req.body.country_code ? req.body.country_code : null,
            email: req.body.email,
            deviceType: req.body.deviceType
        };
        try {
            async.waterfall([
                function (callback) {
                    var email = 0;
                    User.find({ "email": req.body.email, "isDeleted": false, "_id": { $ne: new ObjectId(req.body.user_id) } }, function (err, data) {
                        if (data && data.length > 0) {
                            email = 1;
                            callback({ message: "Email is already exist", email: email });
                        }
                        else {
                            // callback(null);
                            callback(null, { "email": email });
                        }
                        if (err) {
                            console.log('Error====>', err);
                            callback(err);
                        }
                    });
                },
                function (error1, callback) {
                    var phone_number = 0;
                    if (req.body.phone_number) {
                        User.find({ "phone_number": req.body.phone_number, "isDeleted": false, "_id": { $ne: new ObjectId(req.body.user_id) } }, function (err, data) {
                            if (data && data.length > 0) {
                                phone_number = 1;
                                callback({ message: "phone_number is already exist", phone_number: phone_number });
                            }
                            else {
                                // callback(null);
                                callback(null, { "phone_number": phone_number, email: error1.email });
                            }
                            if (err) {
                                console.log('Error====>', err);
                                callback(err);
                            }
                        });
                    } else {
                        callback(null, { "phone_number": phone_number, email: error1.email });
                    }
                },
                function (userdata, callback) {
                    console.log('userdata===>', userdata, "userData===>", userData);
                    if (userdata.email === 0 && userdata.phone_number === 0) {
                        User.update({ "_id": new ObjectId(req.body.user_id) }, { $set: userData }, function (err, response) {
                            if (err) {
                                callback(err);
                            } else {
                                var result = {
                                    message: "Agent updated successfully..",
                                    data: response
                                };
                                console.log('in updated')
                                callback(null, result);
                            }
                        });
                    } else {
                        callback(err);
                    }
                }], function (err, result) {
                    if (err) {
                        console.log("Here", err);
                        return next(err);
                    } else {
                        res.status(config.OK_STATUS).json(result);
                    }
                });
        } catch (e) {
            console.log('here in catch', e);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/**
 * @api {put} /admin/agents/delete delete Agent by Id
 * @apiName Delete Agent
 * @apiDescription Used to delete agent information
 * @apiGroup Admin - Agents
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id User Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Admin unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/delete', (req, res, next) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "user_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        User.update({ _id: { $eq: req.body.user_id } }, { $set: { 'isDeleted': true } }, function (err, response) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Agent Deleted successfully..",
                });
            }
        });
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/**
 * @api {get} /admin/agents/details/:id? Agent Details By Id
 * @apiName Agent Details By Id
 * @apiDescription Get Agent details By user id
 * @apiGroup Admin - Agents
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} id User Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.get('/details/:id', (req, res, next) => {

    User.findOne({ _id: { $eq: req.params.id }, "isDeleted": false }, function (err, data) {
        if (err) {
            return next(err);
        } else {
            res.status(config.OK_STATUS).json({
                message: "Success",
                user: data,
            });
        }
    });
});

/**
 * @api {post} /admin/agents/list List of all agents
 * @apiName Agents List
 * @apiDescription To display agents list with pagination
 * @apiGroup Admin - Agents
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} length pagination length no of page length
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/list', (req, res, next) => {
    var schema = {
        'start': {
            notEmpty: true,
            errorMessage: "start is required"
        },
        'length': {
            notEmpty: true,
            errorMessage: "length is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        try {
            var defaultQuery = [
                {
                    $match: {
                        "isDeleted": false,
                        "type": "agent"
                    }
                },
                {
                    $sort: { 'createdAt': -1 }
                }
            ];
            if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
                var colIndex = req.body.order[0].column;
                var colname = req.body.columns[colIndex].name;
                var order = req.body.order[0].dir;
                if (req.body.columns[colIndex].isNumber) {
                    if (order == "asc") {
                        defaultQuery = defaultQuery.concat({
                            $sort: { [colname]: 1 }
                        });
                    } else {
                        defaultQuery = defaultQuery.concat({
                            $sort: { [colname]: -1 }
                        });
                    }
                } else {
                    colname = '$' + colname;
                    if (order == "asc") {
                        defaultQuery = defaultQuery.concat({
                            $project: {
                                "records": "$$ROOT",
                                "sort_index": { "$toLower": [colname] }
                            }
                        },
                            {
                                $sort: { "sort_index": 1 }
                            },
                            {
                                $replaceRoot: { newRoot: "$records" }
                            })
                    } else {
                        defaultQuery = defaultQuery.concat({
                            $project: {
                                "records": "$$ROOT",
                                "sort_index": { "$toLower": [colname] }
                            }
                        },
                            {
                                $sort: {
                                    "sort_index": -1
                                }
                            },
                            {
                                $replaceRoot: { newRoot: "$records" }
                            })
                    }
                }
            }
            if (req.body.search != undefined) {
                if (req.body.search.value != undefined) {
                    var regex = new RegExp(req.body.search.value);
                    var match = { $or: [] };
                    req.body['columns'].forEach(function (obj) {
                        if (obj.name) {
                            var json = {};
                            if (obj.isNumber) {
                                json[obj.name] = parseInt(req.body.search.value)
                            } else {
                                json[obj.name] = {
                                    "$regex": regex,
                                    "$options": "i"
                                }
                            }
                            match['$or'].push(json)
                        }
                    });
                }
                var searchQuery = {
                    $match: match
                }
                defaultQuery = defaultQuery.concat(searchQuery);
            }

            defaultQuery = defaultQuery.concat([{
                $group: {
                    "_id": "",
                    "recordsTotal": {
                        "$sum": 1
                    },
                    "data": {
                        "$push": "$$ROOT"
                    }
                }
            },
            {
                $project: {
                    "recordsTotal": 1,
                    "data": { "$slice": ["$data", parseInt(req.body.start), parseInt(req.body.length)] }
                }
            }
            ]);
            console.log('this is query for sahil==>', JSON.stringify(defaultQuery));
            User.aggregate(defaultQuery, function (err, data) {
                if (err) {
                    console.log('err===>', err);
                    return next(err);
                } else {
                    console.log('result===>', data);
                    res.status(config.OK_STATUS).json({
                        message: "Success",
                        result: data.length != 0 ? data[0] : { recordsTotal: 0, data: [] }
                    });
                }
            })
        } catch (err) {
            res.status(config.BAD_REQUEST).json({
                status: "failed",
                error: err
            });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/**
 * @api {post} /admin/agents/rental_list List of all rental of agents
 * @apiName Agent Rental List
 * @apiDescription To display agent rental list with pagination
 * @apiGroup Admin - Agents
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * @apiParam {String} agent_id list for perticular agentId
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/rental_list', async (req, res, next) => {
    var schema = {
        'start': {
            notEmpty: true,
            errorMessage: "start is required"
        },
        'length': {
            notEmpty: true,
            errorMessage: "length is required"
        },
        'agent_id': {
            notEmpty: true,
            errorMessage: "agent id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var defaultQuery = [
            {
                $match: {
                    $or: [
                        { car_handover_by_agent_id: new ObjectId(req.body.agent_id) },
                        { car_receive_by_agent_id: new ObjectId(req.body.agent_id) }
                    ]
                }
            },
            {
                $lookup:
                {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userId"
                }
            },
            {
                $unwind: {
                    "path": "$userId",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $match: { "isDeleted": false }
            }];
        defaultQuery.push(
            {
                $project: {
                    _id: 1,
                    booking_number: 1,
                    name: { $concat: ["$userId.first_name", " ", "$userId.last_name"] },
                    isDeleted: 1,
                    from_time: 1,
                    to_time: { $subtract: ["$to_time", 1 * 24 * 60 * 60000] },
                    booking_rent: "$total_booking_amount",
                    createdAt: 1,
                    days: 1
                }
            });
        if (typeof req.body.search !== "undefined" && req.body.search !== null && Object.keys(req.body.search).length > 0 && req.body.search.value !== '') {
            if (req.body.search.value != undefined && req.body.search.value !== '') {
                var regex = new RegExp(req.body.search.value);
                var match = { $or: [] };
                req.body['columns'].forEach(function (obj) {
                    if (obj.name) {
                        var json = {};
                        if (obj.isNumber) {
                            console.log(typeof parseInt(req.body.search.value));
                            json[obj.name] = parseInt(req.body.search.value)
                        } else {
                            json[obj.name] = {
                                "$regex": regex,
                                "$options": "i"
                            }
                        }
                        match['$or'].push(json)
                    }
                });
            }
            console.log('re.body.search==>', req.body.search.value);
            var searchQuery = {
                $match: match
            }
            defaultQuery.push(searchQuery);
            console.log("==>", JSON.stringify(defaultQuery));
        }
        if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
            var colIndex = req.body.order[0].column;
            var colname = req.body.columns[colIndex].name;
            var order = req.body.order[0].dir;
            if (req.body.columns[colIndex].isNumber) {
                if (order == "asc") {
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: 1 }
                    });
                } else {
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: -1 }
                    });
                }
            } else {
                colname = '$' + colname;
                if (order == "asc") {
                    defaultQuery = defaultQuery.concat({
                        $project: {
                            "records": "$$ROOT",
                            "sort_index": { "$toLower": [colname] }
                        }
                    },
                        {
                            $sort: { "sort_index": 1 }
                        },
                        {
                            $replaceRoot: { newRoot: "$records" }
                        })
                } else {
                    defaultQuery = defaultQuery.concat({
                        $project: {
                            "records": "$$ROOT",
                            "sort_index": { "$toLower": [colname] }
                        }
                    },
                        {
                            $sort: {
                                "sort_index": -1
                            }
                        },
                        {
                            $replaceRoot: { newRoot: "$records" }
                        })
                }
            }
        }
        var totalrecords = await CarBooking.aggregate(defaultQuery);
        if (req.body.start) {
            defaultQuery.push({
                "$skip": req.body.start
            })
        }
        if (req.body.length) {
            defaultQuery.push({
                "$limit": req.body.length
            })
        }
        console.log('defaultQuery====.', JSON.stringify(defaultQuery));
        CarBooking.aggregate(defaultQuery, function (err, data) {
            if (err) {
                console.log('err===>', err);
                return next(err);
            } else {
                console.log('result===>', data);
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: { data: data, recordsTotal: totalrecords.length }
                });
            }
        })

    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});
module.exports = router;
