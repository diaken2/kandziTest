const express = require('express')
const app = express()
const mongoose = require('mongoose')
const path=require('path')
const PORT = process.env.PORT || 8888
const routes = require("./routes/auth.route")
app.use(express.json({ extended: true }))
app.use("/api", routes)
app.use('/images',express.static(path.join(__dirname,'images')))




const start = async () => {
    try {
        await mongoose.connect("mongodb+srv://admin:VuuPmdg0eOH513YO@startup.b9uhyf0.mongodb.net/?retryWrites=true&w=majority", {})
        app.listen(PORT, () => {
            console.log("Server has been launched on PORT:", PORT)
        }) 
    }
    catch (e) {
        console.log(e.message)
        return
    }


}

start()