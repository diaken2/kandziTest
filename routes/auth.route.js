const { Router } = require('express')
const router = Router()
const User = require("../models/User")
const { v4: uuidv4 } = require('uuid');
const imgbbUploader = require("imgbb-uploader");
const { check, validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const fileMulter = require('../multer/file')
const mongoose = require('mongoose');
router.post('/register', [
    check('email', 'Неверный почтовый ящик').isEmail(),
    check('password', 'Минимальная длина пароля 6 символов')
        .isLength({ min: 6 })
], async (req, res) => {

    try {
        const errors = validationResult(req)

        if (!errors.isEmpty()) {

            if (errors.errors.length == 2) {
                return res.json({
                    errors: errors.array(),
                    message: `Неверные данные при регистрации: ${errors.errors[0].msg}, ${errors.errors[1].msg}`
                })
            }
            if (errors.errors.length == 1) {
                return res.json({
                    errors: errors.array(),
                    message: errors.errors[0].msg
                })
            }
            return 0
        }
        const { email, password } = req.body
        const candidate = await User.findOne({ email })
        if (candidate) {
            res.json({ message: "Пользователь с такой почтой уже существует." })
            return
        }
        const hashedPassword = await bcrypt.hash(password, 12)
        const user = new User({
            email, password: hashedPassword, cards: [
                {
                    type: "jp",
                    items: [

                    ]
                }
            ]
        })
        await user.save()
        const thisUser = await User.findOne({ email })
        res.json({ thisUser })
    }
    catch (e) {
        console.log(e.message)
        return res.json({ message: e.message })


    }
})













router.post('/login', [
    check('email', 'Введите, пожалуйста, действительный адрес электронной почты.').normalizeEmail().isEmail(),
    check('password', 'Введите пароль').exists()
], async (req, res) => {
    try {
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            if (errors.errors.length == 2) {
                return res.json({
                    errors: errors.array(),
                    message: `Неверные данные при входе в аккаунт: ${errors.errors[0].msg}, ${errors.errors[1].msg}`
                })
            }
            if (errors.errors.length == 1) {
                return res.json({
                    errors: errors.array(),
                    message: errors.errors[0].msg
                })
            }
            return 0
        }
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (!user) {
            return res.json({ message: "Пользователь с такой почтой не существует." })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.json({ message: 'Неверный пароль, попробуйте снова.' })
        }

        res.json({ email: user._id })
    }
    catch (e) {
        console.log(e.message)
        return res.json({ message: e.message })
    }
})
async function findAsync(arr, asyncCallback) {
    const promises = arr.map(asyncCallback);
    const results = await Promise.all(promises);
    const index = results.findIndex(result => result);
    return arr[index];
}


router.post('/createCard', fileMulter.single('cardImage'), async (req, res) => {
    try {
        console.log('ТЕЛО ЗАПРОСА В CREATECARD', req.body)
        const { kandzi, read, translate, cardType, userId } = req.body
        const user = await User.findOne({ _id: userId })


        // if (cardType == 'jp') {
        imgbbUploader("7b679b96afa0e347ade16556f4aeba96", req.file.path)
            .then(async (response) => {

                let allCards = user.cards
                console.log('профиль', allCards)

                findAsync(allCards, async e => {
                   

                    if (e.type == cardType) {
                        console.log('ТИП КАРТЫ2', cardType)
                        let newJpWordList = e.items
                        let newJpWordListAdd = {
                            idOfCard: uuidv4() + 'cardType:' + cardType + 'user:' + user._id, kandzi, read, translate, image: response.url
                        }
                        newJpWordList.push(newJpWordListAdd)

                        let newAllCards = allCards.map((carde) => (

                            carde.type == cardType
                                ? { type: cardType, items: newJpWordList }
                                : carde
                        ))
                        await User.updateOne({ _id: userId }, { cards: allCards })

                        res.json({ msg: "Карточка успешно добавлена!", user: user._id, cardType, newJpWordListAdd })
                    }
                })
                // let newJpWordList = user.jpWordList
                // let newJpWordListAdd = {
                //     idOfCard: uuidv4() + 'cardType:' + 'jp' + 'user:' + user._id, kandzi, read, translate, image: response.url
                // }
                // newJpWordList.push(newJpWordListAdd)
                // await User.updateOne({ _id: userId }, { cards: newJpWordList })
                // console.log(user)
                // res.json({ msg: "Карточка успешно добавлена!", user: user._id })
            })
            .catch((error) => {
                console.error(error)
                return 0
            });
        // }

    }
    catch (e) {
        console.log(e.message)
        return res.json({ message: e.message })
    }
})



router.post('/updateParams', fileMulter.single('cardImage'), async (req, res) => {

    try {
        console.log(req.body)
        const { cardType, userId, idOfCard } = req.body
        const user = await User.findOne({ _id: userId })
        imgbbUploader("7b679b96afa0e347ade16556f4aeba96", req.file.path)
            .then(async (response) => {
                let allCards = user.cards
                findAsync(allCards, async e => {
                    if (e.type == cardType) {

                        let newJpWordList = e.items
                        const newCard = newJpWordList.map((item) => (
                            item.idOfCard == idOfCard
                                ? { ...item, kandzi: req.body.kandzi, read: req.body.read, translate: req.body.translate, image: response.url }
                                : item
                        ));


                        console.log(allCards)
                        let newAllCards = allCards.map((carde) => (

                            carde.type == cardType
                                ? { type: cardType, items: newCard }
                                : carde
                        ))


                        await User.updateOne({ _id: userId }, { cards: newAllCards })
                        console.log('Карточка успешно изменена!')
                        res.json({ msg: "Карточка успешно изменена!", image: response.url, user: user._id, cardType })

                    }
                })

            })
            .catch((error) => {
                console.error(error)
                return 0
            });
    }
    catch (e) {
        res.json({ message: e.message })
        return 0
    }

})







router.post('/updateParamsX', async (req, res) => {

    try {
        console.log('UPDATEPARAMSXINFORM', req.body)
        const { cardType, userId, idOfCard } = req.body
        const user = await User.findOne({ _id: userId })

        let allCards = user.cards
        findAsync(allCards, async e => {
            if (e.type == cardType) {

                let newJpWordList = e.items
                const newCard = newJpWordList.map((item) => (
                    item.idOfCard == idOfCard
                        ? { ...item, kandzi: req.body.kandzi, read: req.body.read, translate: req.body.translate, image: req.body.cardImage }
                        : item
                ));


                console.log(allCards)
                let newAllCards = allCards.map((carde) => (

                    carde.type == cardType
                        ? { type: cardType, items: newCard }
                        : carde
                ))


                await User.updateOne({ _id: userId }, { cards: newAllCards })
                console.log('Карточка успешно изменена!')
                res.json({ msg: "Карточка успешно изменена!", user: user._id, cardType })

            }
        })


    }
    catch (e) {
        res.json({ message: e.message })
        return 0
    }

})





router.post('/deleteCard', async (req, res) => {
    try {
        console.log('Delete', req.body)
        const { user, idCard, cardType } = req.body
        const userCards = await User.findOne({ _id: user })
        console.log(userCards)
        let allCards = userCards.cards
        console.log(allCards)
        findAsync(allCards, async e => {
            if (e.type == cardType) {
                let cardList = e.items
                let itemsFilter = cardList.filter((e) => {
                    return e.idOfCard != idCard
                })
                let newAllCards = allCards.map((carde) => (

                    carde.type == cardType
                        ? { type: cardType, items: itemsFilter }
                        : carde
                ))
                await User.updateOne({ _id: user }, { cards: newAllCards })
                res.json({ msg: "Карточка успешно удалена!", user: userCards._id, cardType })


            }
        })

    }
    catch (e) {
        res.json({ message: e.message })
        return 0
    }
})




router.post('/startTest', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const { idOfTestCard, cardNumber, checkAllClick, deleteObject,cardType } = req.body
console.log('ТИП КАРТЫ', cardType)
        console.log(idOfTestCard)
        console.log(idOfTestCard)
        console.log()
        if (checkAllClick == 1) {



            User.aggregate([
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(req.body.user),
                    },
                },
                {
                    $unwind: '$cards',
                },
                {
                    $match: {
                        'cards.type': cardType,
                    },
                },
                {
                    $unwind: '$cards.items',
                },
                {
                    $match: {
                        'cards.items.idOfCard': { $nin: deleteObject },
                    },
                },
                {
                    $group: {
                        _id: '$_id',
                        items: { $push: '$cards.items' },

                    }
                }
                ,

                {
                    $project: {
                        _id: '$_id',
                        items: { $arrayElemAt: ['$items', Number(cardNumber)] },

                    },
                }

            ]).then((result) => {
                console.log(cardNumber)
                console.log(result)
                res.json({ testItem: result[0].items })
                // Делаем что-то с результатом
            }).catch((error) => {
                console.log(error);
            })

        }
        else {
            User.aggregate([
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(req.body.user),
                    },
                },
                {
                    $unwind: '$cards',
                },
                {
                    $match: {
                        'cards.type': cardType,
                    },
                },
                {
                    $unwind: '$cards.items',
                },
                {
                    $match: {
                        'cards.items.idOfCard': idOfTestCard,
                    },
                },
                {
                    $group: {
                        _id: '$_id',
                        items: { $push: '$cards.items' },
                    },
                }
            ]).then(result => {
                res.json({ testItem: result[0].items[0] })
                console.log('результат', result[0].items[0])
            }).catch(e => {
                res.json({ message: 'error' })
                console.log(e.error)
                return
            })
        }
    }
    catch (e) {
        res.json({ message: 'error' })
        console.log(e.error)
        return
    }
})



router.post('/searchCards', async (req, res) => {
    try {
        

        const searchTerm = req.body.searchTerm;
        console.log(searchTerm)
        User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.body.user),
                },
            },
            {
                $unwind: '$cards',
            },
            {
                $match: {
                    'cards.type': req.body.cardType,
                },
            },
            {
                $unwind: '$cards.items',
            },
            {
                $match: {
                    'cards.items.translate': { $regex: searchTerm, $options: 'i' },
                },
            },
            {
                $group: {
                    _id: '$_id',
                    items: { $push: '$cards.items' },
                },
            }
        ]).then(async (result) => {
            if (result[0] != undefined && searchTerm != "") {
                res.json({ items: result[0].items, fetchoff: 1 });
            }

            else {
                const user = await User.aggregate([
                    { $match: { _id: new mongoose.Types.ObjectId(req.body.user) } },
                    { $unwind: "$cards" },
                    { $match: { "cards.type": req.body.cardType, "cards.items": { $exists: true, $not: { $size: 0 } } } },
                    { $project: { _id: 0, items: { $reverseArray: "$cards.items" }, totalCount: { $size: "$cards.items" } } },
                    { $project: { items: { $slice: ["$items", (1 - 1) * 15, 15] }, totalCount: 1 } }
                ]);
                console.log(user[0].items)

                res.json({ items: user[0].items, fetchoff: 0, msg: result[0] == undefined && searchTerm != '' ? 'По вашему запросу ничего не найдено.' : searchTerm == '' ? 'Пустой запрос. Отображены все карточки.' : '' })

            }

        })
            .catch((error) => {
                console.log(error);
            });

    } catch (e) {
        res.json({ message: 'error' })
        console.log(e.error)
        return
    }







})



async function getCartsAggregate(ide){
    const cardsGetType=await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(ide) } },
        { $unwind: "$cards" },
        { $project: { _id:0 } },
        { $project: { types: "$cards.type" } }
    ]);
    return cardsGetType
}

 

router.post('/createUniqueAlbum',fileMulter.single('image'),async(req,res)=>{
    try{
        const {id,titleAlbum,colon} = req.body
        console.log(req.body)
        console.log(519)
    
        const cardsGetType=await User.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(req.body.id) } },
            { $unwind: "$cards" },
            { $project: { _id:0 } },
            { $project: { types: "$cards.type" } }
        ]); 
       let cardTypes=[]
        cardsGetType.find((e)=>{
cardTypes.push(e.types)
        })
        console.log(cardTypes)
    if(cardTypes.includes(titleAlbum)){  
        return res.json({mesg:'Альбом уже существует'})
    }
    console.log(523)
    imgbbUploader("7b679b96afa0e347ade16556f4aeba96", req.file.path)
            .then(async (response) => {
                console.log(526)
                const user=await User.findOne({_id:req.body.id})
                console.log('До: ',user)
                let ArrayCards=[...user.cards]
                const objectUser={
                    type:titleAlbum,
                    items:[],
                    image:response.url,
                    colon
                }
                ArrayCards.push(objectUser)
                console.log('Добавлено!')
                await User.updateOne({ _id: req.body.id }, { cards: ArrayCards })
                const cardsGetTypeTwo=await User.aggregate([
                    { $match: { _id: new mongoose.Types.ObjectId(req.body.id) } },
                    { $unwind: "$cards" },
                    { $project: { _id:0 } },
                    { $project: { types: "$cards.type", image:"$cards.image", colon:'$cards.colon' } }
                ]); 
                let cardTypesTwo=[]
                console.log('CARDSGETTYPEEEE',cardsGetTypeTwo)
                cardsGetTypeTwo.find((e)=>{
                    const objCardTypes={
                        type:e.types,
                        image:e.image,
                        colon:e.colon
                    }
        cardTypesTwo.push(objCardTypes)
                })
                res.json({cardTypes:cardTypesTwo, msg:'Альбом успешно создан!'})
               

            }).catch((error) => {
                res.json({ message:error })
        console.log(error)
        return
            });
    }
    catch(e){
        res.json({ message: e.error })
        console.log(e.error)
        return
    }
    
        // }
    
})

router.post('/createAlbum',async(req,res)=>{
    try{
        
        const {id,lng}=req.body
        
        const getCardsType=await User.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(req.body.id) } },
            { $unwind: "$cards" },
            { $project: { _id:0 } },
            { $project: { types: "$cards.type" } }
        ]); 
       let cardTypesTwo=[]
       getCardsType.find((e)=>{
cardTypesTwo.push(e.types)
        })
        console.log(cardTypesTwo)
    if(cardTypesTwo.includes(lng)){  
        return res.json({mesg:'Альбом уже существует'})
    }
        const user=await User.findOne({_id:req.body.id})
        console.log('До: ',user)
        let ArrayCards=[...user.cards]
        const objectUser={
            type:lng,
            items:[]
        }
        ArrayCards.push(objectUser)
        await User.updateOne({ _id: req.body.id }, { cards: ArrayCards })
        const cardsGetType=await User.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(req.body.id) } },
                { $unwind: "$cards" },
                { $project: { _id:0 } },
                { $project: { types: "$cards.type", image:"$cards.image", colon:'$cards.colon' } }
            ]); 
            cardTypes=[]
            console.log('CARDSGETTYPEEEE',cardsGetType)
            cardsGetType.find((e)=>{
                const objCardTypes={
                    type:e.types,
                    image:e.image,
                    colon:e.colon
                }
    cardTypes.push(objCardTypes)
            })
                
               
    res.json({cardTypes, msg:'Альбом успешно создан!'})
    }
    catch(e){
        res.json({ message: e.error })
        console.log(e.error)
        return
    }
   
})






router.post('/allCards', async (req, res) => {

    

    console.log('ТЕЛО ЗАПРОСА', req.body)





    console.log(req.query.page)
    try {
        let cardTypes=null
        let page = parseInt(req.query.page);
        const user = await User.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(req.body.email) } },
            { $unwind: "$cards" },
            { $match: { "cards.type": req.body.lng, "cards.items": { $exists: true, $not: { $size: 0 } } } },
            { $project: { _id: 0, items: { $reverseArray: "$cards.items" }, totalCount: { $size: "$cards.items" } } },
            { $project: { items: { $slice: ["$items", (page - 1) * 15, 15] }, totalCount: 1 } }
        ]);
        if(page==1){
            const cardsGetType=await User.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(req.body.email) } },
                { $unwind: "$cards" },
                { $project: { _id:0 } },
                { $project: { types: "$cards.type", image:"$cards.image", colon:'$cards.colon' } }
            ]); 
            cardTypes=[]
            console.log('CARDSGETTYPEEEE',cardsGetType)
            cardsGetType.find((e)=>{
                const objCardTypes={
                    type:e.types,
                    image:e.image,
                    colon:e.colon
                }
    cardTypes.push(objCardTypes)
            })
        }
        const getUser=await User.findOne({_id:req.body.email})
        console.log('USSSSSSSSSSSERRRRRRRRRRRR', getUser)
        
        if (user[0] == undefined) {
            console.log('undefined user')
            console.log(cardTypes)
            res.json({ items: [], totalCount: 0, cardTypes })
            return
        }
        console.log('useris')
        console.log(user[0])
        console.log('МАССИВ С КАРТАМИ',cardTypes)
        res.json({ items: user[0]?.items, totalCount: user[0]?.totalCount, cardTypes });

    }
    catch (e) {
        res.json({ message: e.error })
        console.log(e.error)
        return
    }
})
module.exports = router