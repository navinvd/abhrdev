//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var CompanyTermsAndConditionSchema = new Schema({
    terms_and_conditons: {
        type: String,
        required: true
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

// Compile model from schema
var CompanyTermsAndConditionModel = mongoose.model('car_company_terms_and_condition', CompanyTermsAndConditionSchema, 'car_company_terms_and_condition');
module.exports = CompanyTermsAndConditionModel;