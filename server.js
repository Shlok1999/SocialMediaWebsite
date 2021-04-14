var express=require('express')
var app=express();

var formidable=require('express-formidable')
app.use(formidable());
var mongodb=require('mongodb');
var mongoClient=mongodb.MongoClient;

var ObjectID=mongodb.ObjectID;


var http=require('http').createServer(app);
var bcrypt=require('bcrypt')
var fs=require('fs');

var jwt=require('jsonwebtoken');
var accessTokenSecret='myAccessToken1234567890';

app.use('/public', express.static(__dirname + '/public'));
app.set('view engine', 'ejs')

var socketIO=require('socket.io')(http);
var socketID=""
var users=[];

var mainURL='http://localhost:3000';

http.listen(3000, function(){
    console.log("Server started...")

    mongoClient.connect('mongodb://localhost:27017', function(error, client ){
        var database=client.db('socialnetwork')
        console.log("Database connected...")


        app.get('/signup', (req, res)=>{
            res.render("signup")

        })
        app.post('/signup', (req, res)=>{
            var name=req.fields.name
            var username=req.fields.username;
            var email=req.fields.email;
            var password=req.fields.password;
            var gender=req.fields.gender;

            database.collection('users').findOne({
                $or: [{
                    'email': email
                },{
                    'username': username
                }]
            },(error, user)=>{
                if(user==null){
                    bcrypt.hash(password, 10, (error, hash)=>{
                        database.collection('users').insertOne({
                            'name': name,
                            'username': username,
                            'email': email,
                            'password': hash,
                            'proImg': "",
                            "coverPhoto": "",
                            'friends': [],
                            'notifications': [],
                            'posts': [],
                            "dob": "",
							"city": "",
							"country": "",
							"aboutMe": "",
							"friends": [],
							"pages": [],
							"notifications": [],
							"groups": [],
							"posts": []

                        }, (error, data)=>{
                            res.json({
                                'status': 'success',
                                'message': 'Signed up successfully'
                            })
                        })
                    })
                }
                else{
                    res.json({
                        'status': 'error',
                        'message': 'Already Signed up'
                    })
                }
            }
        
            )

        })
        app.get('/login', (req,res)=>{
            res.render('login')
        })

        app.post("/login", function (req, res) {
			var email = req.fields.email;
			var password = req.fields.password;
			database.collection("users").findOne({
				"email": email
			}, function (error, user) {
				if (user == null) {
					res.json({
						"status": "error",
						"message": "Email does not exist"
					});
				} else {
					bcrypt.compare(password, user.password, function (error, isVerify) {
						if (isVerify) {
							var accessToken = jwt.sign({ email: email }, accessTokenSecret);
							database.collection("users").findOneAndUpdate({
								"email": email
							}, {
								$set: {
									"accessToken": accessToken
								}
							}, function (error, data) {
								res.json({
									"status": "success",
									"message": "Login successfully",
									"accessToken": accessToken,
									"proImg": user.proImg
								});
							});
						} else {
							res.json({
								"status": "error",
								"message": "Password is not correct"
							});
						}
					});
				}
			});
		});

        app.get('/updateProfile', (req, res)=>{
            res.render('updateProfile')
        })

        app.post('/getUser', (req, res)=>{
            var accessToken=req.fields.accessToken;
            database.collection('users').findOne({
                'accessToken': accessToken
            }, (error, user)=>{
                if(user==null){
                    res.json({
                        'status': 'error',
                        'message': 'User has been logged out'
                    })
                }
                else{
                    res.json({
                        'status': 'success',
                        'message': 'Record has been fetched',
                        'data': user
                        
                    })
                }

            })
        })
        app.get('/logout', (req, res)=>{
            res.redirect('/login')
        })


        app.post("/uploadCoverPhoto", function (request, result) {
			var accessToken = request.fields.accessToken;
			var coverPhoto = "";

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					if (request.files.coverPhoto.size > 0 && request.files.coverPhoto.type.includes("image")) {

						if (user.coverPhoto != "") {
							fs.unlink(user.coverPhoto, function (error) {
								//
							});
						}

						coverPhoto = "public/images/" + new Date().getTime() + "-" + request.files.coverPhoto.name;

						// Read the file
	                    fs.rename(request.files.coverPhoto.path, function (err, data) {
	                        if (err) throw err;
	                        console.log('File read!');
 //fs.readFile(filepath[0],"utf8", (err,data)
	                        // Write the file
	                        fs.writeFile(coverPhoto, data, function (err) {
	                            if (err) throw err;
	                            console.log('File written!');

	                            database.collection("users").updateOne({
									"accessToken": accessToken
								}, {
									$set: {
										"coverPhoto": coverPhoto
									}
								}, function (error, data) {
									result.json({
										"status": "status",
										"message": "Cover photo has been updated.",
										data: mainURL + "/" + coverPhoto
									});
								});
	                        });

	                        // Delete the file
	                        fs.unlink(request.files.coverPhoto.path, function (err) {
	                            if (err) throw err;
	                            console.log('File deleted!');
	                        });
	                    });
					} else {
						result.json({
							"status": "error",
							"message": "Please select valid image."
						});
					}
				}
			});
		});

        app.post('/uploadproImg', (req, res)=>{
            var accessToken=req.fields.accessToken;
            var proImg="";

            database.collection('users').findOne({
                'accessToken': accessToken
            }, (error, user)=>{
                if(user==null){
                    res.json({
                        'status': 'error',
                        'message': 'User has been logged out. Please login again'
                    })

                }else{
                    if(req.files.proImg.size>0 && req.files.proImg.type.includes('Image')){

                        if(user.proImg !=""){
                            fs.unlink(user.proImg, (error)=>{

                            })
                        }
                        proImg='public/images'+new Date().getTime()+'-'+req.files.proImg.name;
                        fs.rename(req.files.proImg.path, proImg, (error)=>{

                        })
                        database.collection('user').updateOne({
                            'accessToken': accessToken
                        },{
                            $set: {
                                'proImg': proImg
                            }
                        }, (error, data)=>{
                            res.json({
                                'status': 'status',
                                'message': 'Profile image has been updated',
                                data: mainURL+'/'+proImg
                            })

                        })
                        
                    }else{
                        res.json({
                            'status': 'error',
                            'message': 'Please select a valid image'
                        })
                    }
                }
            })
        })

        app.post("/updateProfile", function (request, result) {
			var accessToken = request.fields.accessToken;
			var name = request.fields.name;
			var dob = request.fields.dob;
			var city = request.fields.city;
			var country = request.fields.country;
			var aboutMe = request.fields.aboutMe;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					database.collection("users").updateOne({
						"accessToken": accessToken
					}, {
						$set: {
							"name": name,
							"dob": dob,
							"city": city,
							"country": country,
							"aboutMe": aboutMe
						}
					}, function (error, data) {
						result.json({
							"status": "status",
							"message": "Profile has been updated."
						});
					});
				}
			});
		});

        app.get('/', (req, res)=>{
            res.render('index')
        })
		app.post('/addPost', (req, res)=>{
			var accessToken = req.fields.accessToken;
			var caption = req.fields.caption;
			var image = "";
			var video = "";
			var type=req.fields.type;
			var createdAt=new Date().getTime();
			var _id=req.fields._id

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				}else{
					if(req.files.image.size>0 && req.files.image.type.includes('image')){
						image='public/images/'+new Date().getTime()+'-'+req.files.image.name;
						fs.rename(req.files.image.path, image, (error)=>{

						})
					}
					if(req.files.video.size>0 && req.files.video.type.includes('video')){
						video='public/images/'+new Date().getTime()+'-'+req.files.video.name;
						fs.rename(req.files.image.path, video, (error)=>{

						});
					}
					database.collection('posts').insertOne({
						"caption": caption,
						"image": image,
						"video": video,
						"type": type,
						"createdAt": createdAt,
						"likers": [],
						"comments": [],
						"shares": [],
						"user": {
							"_id": user._id,
							"name": user.name,
							"username": user.username,
							"proImg": user.proImg
						}
					},(error, data)=>{
						database.collection('users').updateOne({
							'accessToken': accessToken
						}, {
							$push: {
								'posts':{
									"_id": data.insertedId,
									"caption": caption,
									"image": image,
									"video": video,
									"type": type,
									"createdAt": createdAt,
									"likers": [],
									"comments": [],
									"shares": []
								}
							}
						},(error, data)=>{
							res.json({
								'status':'success',
								'message': 'Post has been uploaded'
							})
						})
					})

					

					
				}

			
			
		})

		app.post('/getNewsfeed', (req, res)=>{
			var accessToken=req.fields.accessToken;
			database.collection('users').findOne({
				'accessToken': accessToken
			},(error, user)=>{
				if(user==null){
					res.json({
						'status': 'error',
						'messsage': 'User has been logged out.Please Login again'
					})
				}else{
					var ids=[];
					ids.push(user._id);

					database.collection('posts').find({
						'user._id':{
							$in: ids
						}
					}).sort({
						'createdAt': -1
					})
					.limit(5)
					.toArray(function(error, data){
						res.json({
							'status': 'success',
							'message': 'Record has been fetched',
							'data': data
						});
					})
				};
			});
		});

       

    });
})
})