require('dotenv').config()
const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors')
const axios = require('axios');

const app = express();

app.use(cors());

const { Schema } = mongoose;

mongoose.set('strictQuery', false);

mongoose.connect(`mongodb+srv://${process.env.USER}:${process.env.USER_KEY}@wordsapi.olarckx.mongodb.net/wordsDB`)
.then(()=>console.log("mongodb is connected"))
.catch(err=>console.error(err));

const listSchema = new Schema({
    main: String,
    word: String,
    data: [String]
})
const List = mongoose.model("List", listSchema);

app.get("/",(req,res)=>{
    res.send({msg:"welcome to words API"})
});

app.get("/alphabet/:data",(req,res)=>{
    const inputWord = req.params.data.slice(0,1);
    List.find({ main: inputWord }, (err, result) => {
        if (err) { console.log(err); }
        else {
            let ans =[];
            result.forEach(element => {
                let {main,word,data} = element;
                ans.push({latter:main,sublatter:word,list:data});
            });
            res.send(result.length === 0 ? [] : ans)
        }
    });
});

app.get("/words/:data", (req, res) => {
    const inputWord = req.params.data
    if (inputWord.length == 2) {
        List.find({ word: inputWord }, (err, result) => {
            if (err) { console.log(err); }
            else {
                res.send(result.length === 0 ? [] : result[0].data)
            }
        });
    } else {
        res.send(["only two alphabates requred"])
    }
});

app.get("/matches/:word", (req, res) => {
    const inputWord = req.params.word;
    if (inputWord.length >= 2) {
        List.find({ word: inputWord.slice(0, 2) }, (err, result) => {
            if (err) { console.log(err); }
            else {
                let data = result.length === 0 ? [] : result[0].data
                let ans = data.filter((item) => item.slice(0, inputWord.length) === inputWord);
                res.send(ans)
            }
        });
    } else {
        res.send(["minimum two alphabates requred"])
    }
})

app.get("/details/matches/:word-:calls", (req, res) => {
    const inputWord = req.params.word;
    const maxLength = Number(req.params.calls)
    
    if (inputWord.length >= 2) {
        List.find({ word: inputWord.slice(0, 2) }, async (err, result) => {
            if (err) { console.log(err); }
            else {
                let data = result.length === 0 ? [] : result[0].data
                let arrlist = data.filter((item) => item.slice(0, inputWord.length) === inputWord);
                res.send(await detailsList(arrlist,maxLength))
            }
        });
    } else {
        res.send(["minimum two alphabates requred"])
    }
})

async function detailsList(arrlist,maxLength){
    let arr = arrlist;
    if(!maxLength){
        return { "ErrorMsg":"invalid input, use <word>-<Number>"}
    }
    let finalLength = maxLength>=10?10:maxLength; //max length of responce
    let vals  = {};
    let length = arr.length>=finalLength?finalLength:arr.length;
    for (let i = 0;i < length; i++) {
        const item = arr[i];
        await new Promise(resolve => {
            
            let url = "https://api.dictionaryapi.dev/api/v2/entries/en/"+item;    
            axios.get(url)
            .then(function (result) {

                let temp= item;
                vals[temp]= result.data;
            })
            .catch(function (error) {

                let temp= item;
                vals[temp]=[];
            })
            .finally(function(){
                resolve();
            });
        });
    }

    return(vals);
}

app.listen(process.env.PORT || 3000, function () {
    console.log("server in running on 3000");
});
  
