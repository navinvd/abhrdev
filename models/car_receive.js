//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var CarReceiveSChema = new Schema({
    // car_rental_company_id: mongoose.Schema.Types.ObjectId,
    user_id : mongoose.Schema.Types.ObjectId,
    car_id : mongoose.Schema.Types.ObjectId,
    agent_id : mongoose.Schema.Types.ObjectId,
    car_rental_company_id :  mongoose.Schema.Types.ObjectId,
    defected_points: [ 
        { type: String , default : null } 
    ],
    milage:{
        type: Number,
        required: true
    },
    petrol_tank: {
        type: Number,
        default: true
    },
    // car_defects_gallery: [{type: String, default : null}],
    car_defects_gallery: [{
        name: { type: String},
        type: {type: String}
    }],
    notes: {
        type: String,
        default : null
    },
    booking_number: {
        type: Number,
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
var CarReceive = mongoose.model('car_receive', CarReceiveSChema, 'car_receive');
module.exports = CarReceive;