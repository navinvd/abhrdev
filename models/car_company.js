//Require Mongoose
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var config = require('./../config');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
//Define a schema
var Schema = mongoose.Schema;
var CarCompanySchema = new Schema({
    name: {
        type: String
    },
    description: {
        type: String,
    },
    country_code: String,
    phone_number: String,
    site_url: String,
    email: {
        type: String,
        required: true
    },
    profile_image: String,
    password: String,
    refreshToken: String,
    place_id : mongoose.Schema.Types.ObjectId,
    agent_ids : [mongoose.Schema.Types.ObjectId],
    service_location: [Number], // [<longitude>, <latitude>] 
    company_address : { 
        country: {type: String, default: null},
        state :{type: String, default: null},
        city :{type: String, default: null},
        address : {type: String, default: null}
    },
    is_Active:{
        type: Boolean,
        default: true
    },
    is_verified: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    modifiedAt: {type: Date, default: Date.now}
}, {versionKey: false});
//password encription
CarCompanySchema.pre('save', function (next) {
    var user = this;
    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password'))
        return next();
    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err)
            return next(err);
        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err)
                return next(err);
            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});
// Compile model from schema
var CarCompany = mongoose.model('car_company', CarCompanySchema, 'car_company');
module.exports = CarCompany;


// service_location:  {
//     coordinates: [Number], // [<longitude>, <latitude>]
//     type: {
//         type: String,
//         default: 'Point'
//     }
// },