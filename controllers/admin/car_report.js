var express = require('express');
var router = express.Router();

var config = require('./../../config');
const ReportHelper = require('./../../helper/report');
var Categoy = require('./../../models/report_category');
var Report = require('./../../models/car_report');
var ObjectId = require('mongoose').Types.ObjectId;
var path = require('path');
var fs = require('fs');
var mailHelper = require('./../../helper/mail');

/**
 * @api {post} /admin/reports/category_list List of all superadmin category
 * @apiName Category List
 * @apiDescription To display category list with pagination
 * @apiGroup Admin - Feedback
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
router.post('/category_list', async (req, res, next) => {
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
                        "isDeleted": false
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
            if (typeof req.body.search !== 'undefined' && req.body.search !== null && Object.keys(req.body.search).length > 0) {
                if (req.body.search.value) {
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
                    var searchQuery = {
                        $match: match
                    }
                    defaultQuery.push(searchQuery);
                }
            }
            var totalRecords = await Categoy.aggregate(defaultQuery);

            if (req.body.start !== null) {
                console.log('in skip===>')
                defaultQuery.push({
                    "$skip": req.body.start
                });
            }
            if (req.body.length) {
                defaultQuery.push({
                    "$limit": req.body.length
                });
            }

            defaultQuery = defaultQuery.concat({
                $group: {
                    "_id": "",
                    "data": {
                        "$push": "$$ROOT"
                    }
                }
            },
                {
                    $project: {
                        "data": "$data"
                    }
                });

            console.log('this is query for sahil==>', JSON.stringify(defaultQuery));
            Categoy.aggregate(defaultQuery, function (err, data) {
                if (err) {
                    console.log('err===>', err);
                    return next(err);
                } else {
                    console.log('result===>', data);
                    res.status(config.OK_STATUS).json({
                        message: "Success",
                        result: { recordsTotal: totalRecords.length, data: data.length > 0 ? data[0].data : [] }
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
 * @api {post} /admin/reports/add/category Add category 
 * @apiName Add New Category
 * @apiDescription Used to add category
 * @apiGroup Admin - Feedback
 * 
 * @apiParam {String} category_name Add category_name 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// add category
router.post('/add/category', async (req, res) => {
    var schema = {
        'category_name': {
            notEmpty: true,
            errorMessage: "Please enter coupon code",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
            const categoryResp = await ReportHelper.addCategory({"category_name": req.body.category_name});
            if (categoryResp.status === 'success') {
                res.status(config.OK_STATUS).json(categoryResp);
            } else {
                res.status(config.BAD_REQUEST).json(categoryResp);
            }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

/**
 * @api {post} /admin/reports/update/category Update category 
 * @apiName Update Category
 * @apiDescription Used to update category
 * @apiGroup Admin - Feedback
 * 
 * @apiParam {String} [category_name] Update coupon code
 * @apiParam {String} category_id unique id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// update category
router.post('/update/category', async (req, res) => {
    var schema = {
        'category_id': {
            notEmpty: true,
            errorMessage: "Please enter category_id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const categoryResp = await ReportHelper.updateCategory(req.body);
        if (categoryResp.status === 'success') {
            res.status(config.OK_STATUS).json(categoryResp);
        } else {
            res.status(config.BAD_REQUEST).json(categoryResp);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

/**
 * @api {put} /admin/reports/delete/category Delete category 
 * @apiName Delete Category
 * @apiDescription Used to Delete category
 * @apiGroup Admin - Feedback
 * 
 * @apiParam {String} category_id category_id 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// delete category
router.put('/delete/category', async (req, res) => {
    var schema = {
        'category_id': {
            notEmpty: true,
            errorMessage: "Please enter category_id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const categoryResp = await ReportHelper.deleteCategory(req.body.category_id);
        if (categoryResp.status === 'success') {
            res.status(config.OK_STATUS).json(categoryResp);
        } else {
            res.status(config.BAD_REQUEST).json(categoryResp);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

/**
 * @api {post} /admin/reports/list create reported car list
 * @apiName Listing of reported
 * @apiDescription This is for listing reported car
 * @apiGroup Admin - Feedback
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * 
 * @apiHeader {String}  Content-Type application/json   
 * @apiHeader {String}  x-access-token Admin unique access-key  
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/list', async (req, res, next) => {

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
        var defaultQuery = [
            {
                "$sort":{
                    "createdAt": -1
                }
            },
            {
              "$match": {
                "isDeleted": false,
              }
            },
            {
              "$lookup": {
                "from": "report_category",
                "localField": "report_type",
                "foreignField": "_id",
                "as": "categoryDetails",
              }
            },
            {
              "$unwind": {
                "path": "$categoryDetails",
                "preserveNullAndEmptyArrays": true
              }
            },
            {
              "$project": {
                "_id": 1,
                "booking_number": 1,
                "category_type": "$categoryDetails.category_name",
                "report_message": 1,
                "status":1,
                "createdAt":1
              }
            }
          ];

        if (typeof req.body.search !== "undefined" && req.body.search !== null && Object.keys(req.body.search).length > 0 && req.body.search.value !== '') {
            if (req.body.search.value != undefined && req.body.search.value !== '') {
                var regex = new RegExp(req.body.search.value);
                var match = { $or: [] };
                req.body['columns'].forEach(function (obj) {
                    if (obj.name) {
                        var json = {};
                        if (obj.isNumber) {
                            // console.log(typeof parseInt(req.body.search.value));
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
            // console.log('re.body.search==>', req.body.search.value);
            var searchQuery = {
                $match: match
            }
            defaultQuery.push(searchQuery);
            // console.log("==>", JSON.stringify(defaultQuery));
        }
        if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
            var colIndex = req.body.order[0].column;
            var colname = req.body.columns[colIndex].name;
            var order = req.body.order[0].dir;
            if(req.body.columns[colIndex].isNumber){
                if(order == "asc"){
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: 1 }
                    });
                }else{
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: -1 }
                    });
                }
            }else{
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
        var totalrecords = await Report.aggregate(defaultQuery);
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
        // console.log('defaultQuery===>', JSON.stringify(defaultQuery));
        Report.aggregate(defaultQuery, function (err, data) {
            // console.log('data===>', data);
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: { recordsTotal: totalrecords.length, data: data }
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

/**
 * @api {post} /admin/reports/change_status change status for report
 * @apiName Change report status
 * @apiDescription This is for change report status
 * @apiGroup Admin - Feedback
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} report_id uniqu Id
 * 
 * @apiHeader {String}  Content-Type application/json   
 * @apiHeader {String}  x-access-token Admin unique access-key  
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/change_status', async (req, res, next) => {

    var schema = {
        'report_id': {
            notEmpty: true,
            errorMessage: "report_id is required"
        },
        'status': {
            notEmpty: true,
            errorMessage: "status is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        try{
            var cond = {
                "_id": new ObjectId(req.body.report_id),
                "isDeleted": false
            };
            var updateData = {
                $set: {
                    "status": req.body.status
                }
            };
            check = await Report.update(cond, updateData);
            if(check.n === 1 && check.nModified === 1){
                var defaultQuery = [
                    {
                        "$match": {
                            "_id": new ObjectId(req.body.report_id),
                            "isDeleted": false
                        }
                    },
                    { 
                        '$lookup':{ 
                            from: 'users',
                            localField: 'user_id',
                            foreignField: '_id',
                            as: 'userDetails' 
                        } 
                    },
                    {
                      "$unwind": {
                        "path": "$userDetails",
                        "preserveNullAndEmptyArrays": true
                      }
                    },
                    { 
                        '$lookup':{ 
                            from: 'cars',
                            localField: 'car_id',
                            foreignField: '_id',
                            as: 'car_details' 
                        } 
                    },
                    { 
                        '$unwind': { 
                            path: '$car_details' 
                        } 
                    },
                    { 
                        '$lookup':{ 
                            from: 'car_model',
                            localField: 'car_details.car_model_id',
                            foreignField: '_id',
                            as: 'car_model' 
                        } 
                    },
                    { 
                        '$unwind': '$car_model' 
                    },
                    { 
                        '$lookup':{ 
                            from: 'car_brand',
                            localField: 'car_details.car_brand_id',
                            foreignField: '_id',
                            as: 'car_brand' 
                        } 
                    },
                    { 
                        '$unwind': '$car_brand' 
                    },
                    {
                        $project: {
                            _id: 1,
                            user_name: "$userDetails.first_name",
                            user_email: "$userDetails.email",
                            car_brand: "$car_brand.brand_name",
                            car_modal: "$car_model.model_name",
                            release_year : "$car_model.release_year",
                            createdAt:1
                        }
                    }
                ];
                console.log('defaultQuery=====>', defaultQuery);
                checkUser = await Report.aggregate(defaultQuery);
                var option = {
                    to: 'dma@narola.email',
                    subject: 'ABHR - Car Report Notification'
                }
                if(req.body.status === 'pending'){
                    var data = { name: checkUser[0].first_name , 
                        message: `You report for “${checkUser[0].car_brand} ${checkUser[0].car_modal}” has been resubmitted successfully.`,
                        report_message : ''};
                }else{
                    var data = { name: checkUser[0].first_name , 
                        message: `Your report for “${checkUser[0].car_brand} ${checkUser[0].car_modal}” has been resolved successfully.`,
                       report_message : ''};
                }
                await mailHelper.send('car_report', option, data, function (err, res) {
                    if (err) {
                        console.log("Mail Error:", err);
                    } else {
                        console.log("Mail Success:", res);
                    }
                })
                res.status(config.OK_STATUS).json({
                    message: "Status Changed Successfully",
                    status : "success"
                });
            }else{
                res.status(config.OK_STATUS).json({
                    message: "Status not Changed Successfully",
                    status : "failed"
                });
            }
        } catch(e){
            res.status(config.BAD_REQUEST).json({
                message: "Something Went Wrong",
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

module.exports = router;