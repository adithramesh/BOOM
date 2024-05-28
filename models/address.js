const mongoose=require('mongoose')

const addressSchema=new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    addressType: { type: String, enum: ['Home', 'Work','Other'], required: true },
    houseName: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: { type: String, required: true }
})

const Address=mongoose.model('Address', addressSchema)

module.exports= Address;