require('dotenv').config()
const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors')
const axios = require('axios');

const app = express();

app.use(cors());

const { Schema } = mongoose;

mongoose.set('strictQuery', false);

mongoose.connect(`mongodb+srv://${process.env.USER_NAME}:${process.env.USER_KEY}@wordsapi.olarckx.mongodb.net/wordsDB`)
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

app.get("/latter/:data",(req,res)=>{
    const inputWord = req.params.data.slice(0,1).toLowerCase();
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
    const inputWord = req.params.data.toLowerCase();
    if (inputWord.length == 2) {
        List.find({ word: inputWord }, (err, result) => {
            if (err) { console.log(err); }
            else {
                res.send(result.length === 0 ? [] : result[0].data)
            }
        });
    } else {
        res.status(404).send(["only two alphabates requred"])
    }
});

app.get("/matches/:word", (req, res) => {
    const inputWord = req.params.word.toLowerCase();
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
        res.status(404).send(["minimum two alphabates requred"])
    }
})

app.get("/details/:word", (req, res) => {
    const inputWord = req.params.word.toLowerCase();
    if (inputWord.length >= 2) {
        List.find({ word: inputWord.slice(0, 2) }, async (err, result) => {
            if (err) { console.log(err) }
            else {
                let data = result.length === 0 ? [] : result[0].data;
                let arrlist = data.filter((item) => item === inputWord);
                let mydata = await detailsList(arrlist,1);
                let sampledata=mydata.length!=0?mydata[inputWord]:[];
                res.send(sampledata);
            }
        });
    } else {
        res.status(404).send(["minimum two alphabates requred"])
    }

});

app.get("/details/matches/:word-:calls", (req, res) => {
    const inputWord = req.params.word.toLowerCase();
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
        res.status(404).send(["minimum two alphabates requred"])
    }
})

function manageData(arr){
    if(arr.length===0){
        return [];
    }
    let result = {"word":"","meanings":[],"audiofiles":[],"phonetic":""}
    arr.forEach((element) => {
        const {word,phonetics,meanings} = element;
        result.word= result.word===word? result.word :word;
        result.phonetic= element.phonetic?element.phonetic:"";
        let tempAudio = phonetics.filter(audioItem=>audioItem.audio);
        if(tempAudio.length!=0){
            tempAudio.forEach(element => {
                if(result.audiofiles.length===0){
                    result.audiofiles.push(element.audio);
                }else{
                    let temp = result.audiofiles.find(item=>item===element.audio);
                    if(!temp){
                        result.audiofiles.push(element.audio);
                    }
                }
            });
        }
        meanings.forEach(item=>{
            let meaningData = {};
            meaningData.partOfSpeech = item.partOfSpeech?item.partOfSpeech:"";
            meaningData.definations = item.definitions.map(def=>def.definition);
            let exampleData = item.definitions.filter(item=>item.example);
            meaningData.examples = exampleData.map(item=>item.example);
            meaningData.synonyms=item.synonyms;
            meaningData.antonyms=item.antonyms;
            if(result.meanings.length===0){
                result.meanings = [...result.meanings, meaningData];
            }else{
                let temp = result.meanings.findIndex(ele=>ele.partOfSpeech===meaningData.partOfSpeech)
                if(temp === -1){
                    result.meanings = [...result.meanings, meaningData];
                }else{
                    result.meanings[temp].definations=[...result.meanings[temp].definations,...meaningData.definations];
                    result.meanings[temp].examples=[...result.meanings[temp].examples,...meaningData.examples];
                    result.meanings[temp].synonyms=[...result.meanings[temp].synonyms,...meaningData.synonyms];
                    result.meanings[temp].antonyms=[...result.meanings[temp].antonyms,...meaningData.antonyms];
                }
            }
            
        })
        result.sourceUrls=[...element.sourceUrls,"https://dictionaryapi.dev/"];
    });
    return result;

}


async function detailsList(arrlist,maxLength){
    let arr = arrlist;
    if(arr.length===0){
        return []
    }
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
            vals[item]=manageData(result.data);
            })
            .catch(function (error) {
            vals[item]=[];
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
  
