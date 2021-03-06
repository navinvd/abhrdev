//Require Mongoose
var mongoose = require('mongoose');
//Define a schema
var Schema = mongoose.Schema;
var NotificationSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    notificationSettingId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    notificationText: {
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

var CarNotifications = mongoose.model('car_notifications', NotificationSchema, 'car_notifications');
module.exports = CarNotifications;