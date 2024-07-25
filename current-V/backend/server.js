
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
  const mysql = require('mysql'); 
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session'); 
const { body, validationResult } = require('express-validator'); 

const saltRounds = 10; 

const app = express();

app.use(session({
  secret: '12345',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public'))); 

app.use(cors());    

let port = 3000; 

const db = mysql.createConnection({
    host: 'localhost',
    user : 'root',
    password : '01061977',
    database : 'cosmicSystem' , 
    port : 3500  , 
    
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
}
);


app.get('/schoolLogin', (req, res) => { 

    console.log('Hello from the server');
    res.sendFile(path.join(__dirname, 'public/schoolLogin.html'));

});
app.get('/schoolRegister', (req, res) => { 

  console.log('Hello from the server');
  res.sendFile(path.join(__dirname, 'public/schoolRegister.html'));

});

app.get("/dashboard" , function(req , res){
  console.log(req.session.userId);
  if (!req.session.userId) {
    res.send("you are not allowed to access this page");
  }  
  res.sendFile(path.join(__dirname, 'public/dashboard.html')); 
}
); 

app.get("/addStudent" , function(req , res){
  console.log(req.session.userId);
  if (!req.session.userId) {
    res.send("you are not allowed to access this page");
  }  
  res.sendFile(path.join(__dirname, 'public/addStudent.html')); 

}); 


app.post("/login", function(req, res) {
    let id = req.body.idSchool;
    let password = req.body.password; 
    
    console.log(id);
    console.log(password);
 
    
     db.query(
      "SELECT * FROM school WHERE idSchool = ? ",
      [id],
      function(err, result) {
        if (err) {
          res.send({ err: err });
        } 
        if (result.length > 0) {
            
        bcrypt.compare(password , result[0].password, function(err, result2) {
          console.log("here");
          console.log(result2);
          console.log(result[0].password);

          if (err) {
            throw err;
          }
          if(result2) {  
            req.session.userId = result[0].idSchool;
            console.log("true");
            res.json({ 
              message: "User logged in successfully!"  , 
              status : 200 }); 
          }else{
            res.json({ 
              message: "wrong password or id ! "  , 
              status : 401 }); 
          }

        });
          
        } else {
          res.json({ message: "Wrong username/password combination!" });
        }
       
        
      }
    );
  });
  
  
  app.get("/getSchool" , function(req , res){ 
    let query = "SELECT name FROM school WHERE idSchool = ? "; 
    db.query(query , [req.session.userId] , function(err , result){
      if(err){
        throw err;
      }
      console.log(result);
      res.json(result);

    })
  });


  app.post("/register", function(req, res) { 
    let name = req.body.name;
    let email = req.body.email;
    let password = req.body.password;
    let wilaya = req.body.wilaya;
    let baladiya = req.body.baladiya;
    let phoneNumber = req.body.phoneNumber;
    let address = req.body.address;

     
 
    bcrypt.hash(req.body.password , saltRounds, function(err, hash) {
      if (err) {
        throw err;
      }else{

       password = hash; 
      db.query("INSERT INTO school (name, email,password,wilaya ,commun,phoneNumber ,address) VALUES (?,?,?,?,?,? ,?)", [name , email, password ,wilaya , baladiya , phoneNumber , address], function(err, result) {
        if (err) {
          res.json({
            message: "An error occurred while registering the user",
            status : 500 , 
          });
          
         
        }
        res.json({
          message: "User registered successfully!" , 
          status : 200 ,
        });

        }); 
      } 
    
    });
    
  }); 

 
  // #################################################################
  // post a new student  

  function isAdmin(req, res, next) {
    if (req.session.userId) {
      next();
    } else {
      res.json({
        message: "You are not authorized !  ",
        status : 401 ,
      })
    }
    
  }
  app.post("/addStudent", isAdmin ,[
    body('name').trim().isAlpha().withMessage('Name must contain only letters').escape(),
    body('familyName').trim().isAlpha().withMessage('Family name must contain only letters').escape(),
    body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
    body('phoneNumber').trim().isMobilePhone().withMessage('Invalid phone number').escape(),
    body('address').trim().escape(),
  ], 
     function(req, res) {  

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.json({
          message: errors.array(),
          status : 402 ,
        });
      }
    let name = req.body.name;
    let familyName  = req.body.familyName ;
    let email = req.body.email;
    let phoneNumber  = req.body.phoneNumber;
    let address = req.body.address; 
    let schoolId = req.session.userId;  


    let query = "INSERT INTO student (name, familyName,email,phoneNumber ,address ,idSchoolF) VALUES (?,?,?,?,?,?)";  

    db.query("SELECT * FROM student WHERE name = ? AND  familyName = ? AND phoneNumber = ? " , [name ,familyName , phoneNumber] , function(err , result){
      if(err){
        throw err;
      }
      if(result.length > 0){
          res.json({
          message: "Student already exists!" , 
          status : 401 ,

        });
        return; 
      }else { 
        db.query(query , [name , familyName , email , phoneNumber , address , schoolId] , function(err , result){
          if(err){
            throw err;
          }
          res.json({
            message: "Student added successfully!" , 
            status : 200 ,
          });
        });
      }
    });

     
  }); 

app.listen(port, () => {
    console.log('Server is running on port ' + port);
}
);

