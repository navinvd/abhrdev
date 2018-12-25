const nodemailer = require('nodemailer');
const config = require('../config');
const smtpTransport = require('nodemailer-smtp-transport');
var EmailTemplate = require('email-templates').EmailTemplate;

var mongoose = require('mongoose');
var User = require('../models/users');
var ObjectId = mongoose.Types.ObjectId;

var mail_helper = {}

//  temp code

//  var transporter = nodemailer.createTransport({
var transporter = nodemailer.createTransport(smtpTransport({
    service: 'gmail',
    host: 'localhost',
    port: 465,
    // secure: false, // upgrade later with STARTTLS
    auth: {
        user: 'demo.narola@gmail.com',
        pass: '!123Narola123'
    },
    tls: { rejectUnauthorized: false },
}));



/*
var transporter = nodemailer.createTransport(smtpTransport({
    service: config.SMTP_SERVICE, // hostname
    tls: {rejectUnauthorized: false},
    auth: {
        user: config.SMTP_MAIL,
        pass: config.SMTP_PASSWORD
    }
}));
*/
mail_helper.send = (template_name, options, data, callback) => {
    var template_sender = transporter.templateSender(new EmailTemplate('emails/' + template_name), {
        from: "ABHR <noreply@gmail.com>"
    });
    template_sender({
        to: options.to,
        subject: options.subject,
    }, data).then(function (info) {
        callback(null, { "status": 1, "message": info });
    }).catch(function (err) {
        callback({ "status": 0, "error": err });
    });
};



// sendEmail
mail_helper.sendEmail = async (template_name, options, data, user_id) => {

    var template_sender = transporter.templateSender(new EmailTemplate('emails/' + template_name), {
        from: "ABHR <noreply@gmail.com>"
    });

    // return template_sender({
    //     to : options.to,
    //     subject: options.subject,
    // },data).then(function(info){

    //     // update query here

    //     console.log('DATATA=>',info);
    //     return {"status":1,"message":info};
    // }).catch(function(err){
    //     console.log('Error=>',err);
    //     // return { status: 'failed', message: "Error occured while sending otp" }
    //     return {"status":0,"error":err};
    // });


    try {
        var email_data = await template_sender({ to: options.to, subject: options.subject }, data);
        var id = { _id: new ObjectId(user_id) }
        var new_data = { $set: { otp_email: data.otp, is_email_verified: false } };
        var datta = await User.update(id, new_data);

        if (datta.n > 0) {
            return { status: 'success', message: "Otp has been sent to your email address", data: data.otp }
        }
        else {
            return { status: 'failed', message: "Error occured while sending otp to your email address" }
        }
    }
    catch (err) {
        return { status: 'failed', message: "Error occured while sending otp to your email address" }
    }
};

module.exports = mail_helper