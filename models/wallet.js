const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    balance: {
        type: Number,
        default: 0,
        required: true
    },
    history: [{
        transaction: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        date: {
            type: Date,
            default: Date.now,
            required: true
        },
        reason: {
            type: String
        }
    }]
},
{
    timestamps:true
}
);

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
