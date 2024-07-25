const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const app = express();
const mysql = require('mysql');
const port = 3001;




// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'cosmic'  
});
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
}
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));





app.use('/uploads', express.static(path.join(__dirname, '../frontend/uploads')));
// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../frontend/uploads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});



// Set up session handling
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

// Render registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/Reg-prof/register.html'));
});

// Render login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/Reg-prof/login.html'));
});



app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/Reg-prof/home.html'));
});
app.use(express.static(path.join(__dirname, '../frontend/dashpart/public')));

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    try {
     

        

        await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, password]);

        res.redirect('/login');
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send('Error registering user');
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, rows) => {
        if (err) {
            return res.status(500).send('Error logging in');
        }

        if (rows.length === 0) {
            return res.status(401).send('Invalid username/password');
        }

        const user = rows[0];
        req.session.user = {
            userId: user.userId,
            username: user.username,
            profile_photo: user.profile_photo
        };

        res.redirect('/showing');
    });
});

app.get('/showing', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('User not logged in');
    }
    res.sendFile(path.join(__dirname, '../frontend/Reg-prof/showing.html'));
});

// Fetch user info
app.get('/user-info', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('User not logged in');
    }
    res.json(req.session.user);
});
const upload = multer({ storage: storage });
app.post('/create', upload.single('profilePhoto'), (req, res) => {
    if (!req.session.user || !req.session.user.userId) {
        return res.status(401).send('User not logged in');
    }

    const { userId } = req.session.user;
    const { schoolName, publication, wilaya, comune, level } = req.body;
    const profilePhoto = req.file ? req.file.filename : null;

    db.query("SELECT * FROM profiles WHERE userId = ?", [userId], (err, rows) => {
        if (err) {
            console.error('Error fetching profile:', err);
            return res.status(500).send('Error fetching profile');
        }

        if (rows.length > 0) {
            // There's an existing profile, get the current photo filename
            const existingProfile = rows[0];
            const oldPhoto = existingProfile.profilePhoto;

            // If there is a new photo and it is different from the old one, delete the old photo
            if (profilePhoto && oldPhoto) {
                const oldPhotoPath = path.join(__dirname, '../frontend/uploads', oldPhoto);
                if (fs.existsSync(oldPhotoPath)) {
                    fs.unlinkSync(oldPhotoPath);
                }
            }

            // Update the profile with the new data
            const query = profilePhoto
                ? "UPDATE profiles SET schoolName = ?, publication = ?, wilaya = ?, comune = ?, profilePhoto = ?, level = ? WHERE userId = ?"
                : "UPDATE profiles SET schoolName = ?, publication = ?, wilaya = ?, comune = ?, level = ? WHERE userId = ?";
            const params = profilePhoto
                ? [schoolName, publication, wilaya, comune, profilePhoto, level, userId]
                : [schoolName, publication, wilaya, comune, level, userId];

            db.query(query, params, (err, result) => {
                if (err) {
                    console.error('Error updating profile:', err);
                    return res.status(500).send('Error updating profile');
                }
                res.redirect('/showing');
            });
        } else {
            // Insert the new profile
            db.query("INSERT INTO profiles (userId, schoolName, publication, wilaya, comune, profilePhoto, level) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [userId, schoolName, publication, wilaya, comune, profilePhoto, level],
                (err, result) => {
                    if (err) {
                        console.error('Error creating profile:', err);
                        return res.status(500).send('Error creating profile');
                    }
                    res.redirect('/showing');
                }
            );
        }
    });
});
app.get('/user-profile', (req, res) => {
    if (!req.session.user || !req.session.user.userId) {
        return res.status(401).send('User not logged in');
    }

    const { userId } = req.session.user;

    db.query("SELECT * FROM profiles WHERE userId = ?", [userId], (err, rows) => {
        if (err) {
            console.error('Error fetching profile:', err);
            return res.status(500).send('Error fetching profile');
        }

        if (rows.length === 0) {
            return res.status(404).send('Profile not found');
        }

        res.json(rows[0]);
    });
});



// admin page and dashboard part

app.get("/dashboard" , function(req , res){
    console.log(req.session.user);
    if (!req.session.user) {
      res.send("you are not allowed to access this page");
    }  
    res.sendFile(path.join(__dirname, '../frontend/dashpart/public','dashboard.html')); 
  }
  ); 

  app.get("/addStudent" , function(req , res){
    console.log(req.session.userId);
    if (!req.session.user) {
      res.send("you are not allowed to access this page");
    }  
    res.sendFile(path.join(__dirname, '../frontend/dashpart/public','addStudent.html')); 
  
  }); 


  const { body, validationResult } = require('express-validator');

  function isAdmin(req, res, next) {
    if (req.session.user) {
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
    console.log(`Server is running on http://localhost:${port}`);
  });
