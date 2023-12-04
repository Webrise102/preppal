//? Initialization of packages

const express = require("express");
const app = express();
const path = require("path");
const dotenv = require("dotenv");
require("dotenv").config();
const port = process.env.PORT || 3000;
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const schedule = require("node-schedule");
const nodemailer = require("nodemailer");
const fetch = require("node-fetch");
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
const cron = require("node-cron");
const fs = require("fs");
const environment = process.env.ENVIRONMENT || "live";
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const endpoint_url = "https://api-m.paypal.com";
  // environment === "live"
  //   ? "https://api-m.sandbox.paypal.com"
  //   : "https://api-m.paypal.com";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  service: "Gmail",

  auth: {
    user: process.env.EMAIL_ACCOUNT,
    pass: process.env.EMAIL_PASSWORD,
  },
});

//? Routes

app.use(express.static("public"));
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

let staticPath = path.join(__dirname, "public");

app.get("/", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});
app.get('/keepalive', (req, res) => {
    // Perform minimal work here
    res.status(200).send('Server is alive!');
});
app.get("/address", (req, res) => {
  res.sendFile(path.join(staticPath, "address.html"));
});
app.get("/catalog", (req, res) => {
  res.sendFile(path.join(staticPath, "catalog.html"));
});
app.get("/room-cooking-pot", (req, res) => {
  res.sendFile(path.join(`${staticPath}/products`, "pot.html"));
});
app.get("/unsubscribe", (req, res) => {
  res.sendFile(path.join(staticPath, "unsubscribe.html"));
});
app.get("/checkout", (req, res) => {
  res.sendFile(path.join(staticPath, "checkout.html"));
});
app.get("/contact", (req, res) => {
  res.sendFile(path.join(staticPath, "contact.html"));
});
app.get("/track", (req, res) => {
  res.sendFile(path.join(staticPath, "track.html"));
});
app.get("/shipping-policy", (req, res) => {
  res.sendFile(path.join(staticPath, "shipping.html"));
});
app.get("/refund-policy", (req, res) => {
  res.sendFile(path.join(staticPath, "refund.html"));
});
app.get("/map-index", (req, res) => {
  res.sendFile(path.join(`${staticPath}/xml`, "index.xml"));
});
app.get("/map-ship", (req, res) => {
  res.sendFile(path.join(`${staticPath}/xml`, "ship.xml"));
});
app.get("/map-catalog", (req, res) => {
  res.sendFile(path.join(`${staticPath}/xml`, "catalog.xml"));
});
app.get("/map-contact", (req, res) => {
  res.sendFile(path.join(`${staticPath}/xml`, "contact.xml"));
});
app.get("/map-pot", (req, res) => {
  res.sendFile(path.join(`${staticPath}/xml`, "pot.xml"));
});
app.get("/map-refund", (req, res) => {
  res.sendFile(path.join(`${staticPath}/xml`, "refund.xml"));
});
app.get("/map-track", (req, res) => {
  res.sendFile(path.join(`${staticPath}/xml`, "track.xml"));
});

//? Subscription Service

//? Subscription Service

const mailer = async function (title, obj) {
  try {
    const email = "Your static email text here"; // Replace with your static email text
    // const text = replaceHTML(email, obj);

    db.query("SELECT email FROM subscriptions2", (err, results) => {
      if (err) {
        console.error("MySQL query error:", err);
      } else {
        results.forEach((row) => {
          const recipientEmail = row.email;

          transporter.sendMail(
            {
              from: `${process.env.EMAIL_ACCOUNT} <${process.env.EMAIL_ACCOUNT}>`,
              to: recipientEmail,
              subject: title,
              replyTo: `${process.env.EMAIL_ACCOUNT}`,
              headers: {
                "Mime-Version": "1.0",
                "X-Priority": "3",
                "Content-type": "text/html; charset=iso-8859-1",
              },
              html: email, // Use the static email text here
            },
            (err) => {
              if (err) {
                console.error("Email sending error:", err);
              }
            }
          );
        });
      }
    });
  } catch (e) {
    console.error("Error reading email template:", e);
  }
};
// Subscription route
app.post("/subscribe/email", async (req, res) => {
  const email = req.body.email;
  db.getConnection((err, connection) => {
    if (err) {
      throw err;
    }
    // Check if the email exists in the database
    db.query(
      "SELECT * FROM subscriptions2 WHERE email = ?",
      [email],
      (err, results) => {
        if (err) {
          console.error("MySQL query error:", err);
          res
            .status(500)
            .json({ message: "Error saving your email", code: "02" });
        } else if (results.length === 0) {
          // Email doesn't exist, validate and add to the database
          if (validateEmail(email)) {
            db.query(
              "INSERT INTO subscriptions2 (email) VALUES (?)",
              [email],
              (err) => {
                if (err) {
                  console.error("MySQL query error:", err);
                  res
                    .status(500)
                    .json({ message: "Error saving your email", code: "02" });
                } else {
                  // Send the "hello" email immediately
                  transporter.sendMail({
                    from: `${process.env.EMAIL_ACCOUNT}`,
                    to: email,
                    subject: "Welcome email",
                    replyTo: `${process.env.EMAIL_ACCOUNT}`,
                    headers: {
                      "Mime-Version": "1.0",
                      "X-Priority": "3",
                      "Content-type": "text/html; charset=iso-8859-1",
                    },
                    html: `Welcome to our newsletter,
                You can unsubscribe by clicking here: <a href="http://localhost:3000/unsubscribe">Unsubscribe</a>`,
                  });

                  res
                    .status(200)
                    .json({ message: "User has subscribed", code: "03" });
                }
              }
            );
          } else {
            res.status(400).json({ message: "Not a valid email", code: "02" });
          }
        } else {
          res
            .status(201)
            .json({ message: "User Already Subscribed", code: "02" });
        }
      }
    );
  });
});
// Check if an email exists in the database
app.get("/subscribe/check/:email", (req, res) => {
  const email = req.params.email;

  // Perform a database query to check if the email exists
  db.query(
    "SELECT * FROM subscriptions2 WHERE email = ?",
    [email],
    (err, results) => {
      if (err) {
        console.error("MySQL query error:", err);
        res.status(500).json({ message: "Error checking email", code: "02" });
      } else {
        if (results.length === 0) {
          // Email doesn't exist, return a response indicating it's not found
          res.status(404).json({ message: "Email not found", code: "01" });
        } else {
          // Email exists, return a response indicating it's found
          res.status(200).json({ message: "Email found", code: "03" });
        }
      }
    }
  );
});

// Unsubscribe route
app.post("/unsubscribe", (req, res) => {
  const { email } = req.query;
  console.log(email);
  const query = "SELECT * FROM subscriptions2 WHERE email = ?";

  db.query(query, [email], (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (results.length === 0) {
      // User not found in the database
      return res.status(422).json({ error: "User not found" });
    }

    // User found, handle the unsubscribe process
    // ...
    // Send a success response if necessary
    return res.status(200).json({ message: "Unsubscribe successful" });
  });

  // Check if the email exists in the database and delete the row
  const sql = "DELETE FROM subscriptions2 WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error("Error unsubscribing:", err);
      res.status(500).send("Error unsubscribing.");
    } else if (result.affectedRows === 0) {
      // Email not found in the database
      res.status(404).send("Email not found in the database.");
    } else {
      res.send(`Unsubscribed email: ${email}`);
    }
  });
});

// Schedule the email sending job
schedule.scheduleJob("00 58 11 * * 3", () => {
  mailer("This is our Subscription Email", {
    content: "Hello, welcome to our email 👋",
  });
});

// Utility function to validate email
const validateEmail = (email) => {
  const regex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(email);
};

// Create a function to send an email
const sendEmail = async (formData) => {
  const mailOptions = {
    from: formData.emailAddress,
    to: `${process.env.EMAIL_ACCOUNT}`, // Replace with the email address you want to receive the emails
    subject: `${formData.emailAddress}: ${formData.subject}`,
    text: `${formData.emailAddress}: ${formData.message}`,
  };

  // Send the email
  await transporter.sendMail(mailOptions);
};

// Create a route to handle the contact form submission
const contactFormRoute = async (req, res) => {
  // Get the form data
  const formData = req.body;
  // Send the email
  await sendEmail(formData);

  // Send a success response
  res.status(200).send({ message: "Email sent successfully!" });
};

// Add the contact form route to your Express app
app.post("/contact-form", contactFormRoute);

//? Payments
app.post("/check-coupon", (req, res) => {
  const code = req.body.code;

  let couponCode = `${process.env.COUPON}`;
  if (code === couponCode) {
    res.status(200).send();
  } else {
    res.status(400).send();
  }
});
app.post("/create-order", (req, res) => {
  const OrderDate = req.body.OrderDate;
  const OrderEmail = req.body.OrderEmail;
  const FirstName = req.body.FirstName;
  const LastName = req.body.LastName;
  const OrderCity = req.body.OrderCity;
  const OrderAddress = req.body.OrderAddress;
  const OrderZIP = req.body.OrderZip; // Correct the case
  const Total = req.body.Total;
  const OrderStatus = req.body.OrderStatus;
  const OrderTrackingNumber = req.body.OrderTrackingNumber;
  const OrderPhone = req.body.OrderPhone;
  const OrderProducts = req.body.OrderProducts;
  const OrderAddress2 = req.body.OrderAddress2;
  const OrderProvince = req.body.OrderProvince;
  const OrderNumber = req.body.OrderNumber;
  const OrderCountry = req.body.OrderCountry;
  // Create a Date object from the input string
  const date = new Date(OrderDate);

  // Extract the components of the date
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // Months are zero-indexed, so add 1
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  // Format the date in the MySQL-friendly format
  const mysqlFriendlyDate = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")} ${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  console.log(
    mysqlFriendlyDate,
    OrderEmail,
    FirstName,
    LastName,
    OrderCity,
    OrderAddress,
    OrderZIP,
    Total,
    OrderStatus,
    OrderTrackingNumber,
    OrderPhone,
    OrderProducts,
    OrderAddress2,
    OrderProvince,
    OrderNumber,
    OrderCountry
  );

  const insertSql =
    "INSERT INTO orderscj (OrderDate, OrderEmail, FirstName, LastName, OrderCity, OrderAddress, OrderZIP, Total, OrderStatus, OrderTrackingNumber, OrderPhone, OrderProducts, OrderAddress2, OrderProvince, OrderNumber, OrderCountry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const values = [
    mysqlFriendlyDate,
    OrderEmail,
    FirstName,
    LastName,
    OrderCity,
    OrderAddress,
    OrderZIP,
    Total,
    OrderStatus,
    OrderTrackingNumber,
    OrderPhone,
    OrderProducts,
    OrderAddress2,
    OrderProvince,
    OrderNumber,
    OrderCountry,
  ];

  db.query(insertSql, values, (err, result) => {
    if (err) {
      console.error("Error inserting data:", err);
      res.status(500).send("Error inserting data");
    } else {
      console.log("Data inserted successfully");
      res.status(200).send("Data inserted successfully");
    }
  });
});
app.post("/check-address", async (req, res) => {
  const address = `${req.body.address.replace(
    / /g,
    "%20"
  )}%2C%20${req.body.city.replace(/ /g, "%20")}%2C%20${req.body.country.replace(
    / /g,
    "%20"
  )}`;
  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/search?text=${address}&format=json&apiKey=918a9c16f81540dd809ae250f9dd4260`
  );
  const data = await response.json();
  res.json({ data });
});

app.post("/send-success", (req, res) => {
  // Define the email data.
  const orderNumber = req.body.orderNumber;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const orderAddress = req.body.address;
  const total = req.body.total;
  const orderDate1 = req.body.orderDate1;
  const orderDate2 = req.body.orderDate2;

  const orderEmail = req.body.email;
  // Get current date
  const today = new Date();

  // Add days to current date
  const futureMinDate = new Date();
  futureMinDate.setDate(today.getDate() + Number(orderDate1));

  const futureMaxDate = new Date();
  futureMaxDate.setDate(today.getDate() + Number(orderDate2));

  // Extract components
  const futureMinDay = futureMinDate.getDate();
  const futureMinMonth = futureMinDate.getMonth() + 1;
  const futureMinYear = futureMinDate.getFullYear();

  const futureDay = futureMaxDate.getDate();
  const futureMonth = futureMaxDate.getMonth() + 1;
  const futureYear = futureMaxDate.getFullYear();

  // Your email template
  const emailTemplate = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@200;400;600&display=swap");
      .button {
        background-color: #000;
        color: #fff;
        padding: 12px 24px;
        text-decoration: none;
        font-family: 'Montserrat', sans-serif;
        cursor: pointer;
      }
      p {
        font-size: 16px;
        font-family: 'Montserrat', sans-serif;
        color: #000000;
      }
      html {
        max-width: 700px;
        font-family: 'Montserrat', sans-serif;
      }
    </style>
  </head>
  <body>
    <p style="font-size: 24px; font-weight: bold">
      Arriving between ${futureMinDay}/${futureMinMonth}/${futureMinYear} and ${futureDay}/${futureMonth}/${futureYear}
    </p>

    <p style=" font-weight: bold">Hi ${firstName},</p>

    <p>We received your order and it will be proceeded within 24 hours</p>
    <p>Your order number: <span style="font-weight: bold">${orderNumber}</span>

<p >Your Total: <span style="font-weight: bold">$${total}</span></p>
<p style="font-size: 12px;">Below you can find address which you wrote, contact us if it isn't right</p>

    <div style="float: left; width: 50%">
      <p style="font-weight: bold">Delivery address</p>
      <p>${firstName} ${lastName}</p>
      <p>${orderAddress}</p>
    </div>

    <div style="float: right; width: 50%">
      <p style="font-weight: bold">Estimated delivery</p>
      <p>between ${futureMinDay}/${futureMinMonth}/${futureMinYear} and ${futureDay}/${futureMonth}/${futureYear}</p>
    </div>
  </body>
</html>
`;
  // Email data
  const mailOptions = {
    from: `${process.env.EMAIL_ACCOUNT}`,
    to: `${orderEmail}`,
    subject: `Thanks for your order`,
    html: emailTemplate,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
});

//? Start Server
// Attempt to get a connection from the pool and check the status
app.post("/check-connection", (req, res) => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("Error connecting to MySQL:", err);
      res.status(500).send();
    }

    console.log("Connected to MySQL");
    res.status(200).send();

    // Release the connection back to the pool when you're done with it.
    connection.release();
  });
});

//? CJDROPSHIPPING API
cron.schedule("0 0 */30 * *", () => {
  let envFileContents = fs.readFileSync(".env", "utf8");

  fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/authentication/refreshAccessToken",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: `${process.env.REFRESH_TOKEN1}${process.env.REFRESH_TOKEN2}${process.env.REFRESH_TOKEN3}`,
      }),
    }
  )
    .then((response) => response.json())
    .then((data) => {
      // Handle the response data
      const accessToken = data.data.accessToken;
// Split the accessToken into three parts
const part1 = accessToken.slice(0, 253);
const part2 = accessToken.slice(253, 505);
const part3 = accessToken.slice(505);

// Replace the old token with the new ones in your .env file
envFileContents = envFileContents.replace(
  /ACCESS_TOKEN1='.*'/,
  `ACCESS_TOKEN1='${part1}'`
);
envFileContents = envFileContents.replace(
  /ACCESS_TOKEN2='.*'/,
  `ACCESS_TOKEN2='${part2}'`
);
envFileContents = envFileContents.replace(
  /ACCESS_TOKEN3='.*'/,
  `ACCESS_TOKEN3='${part3}'`
);

fs.writeFileSync(".env", envFileContents);
    })
    .catch((error) => {
      // Handle errors
      console.error("Error:", error);
    });
});
let delvieryArray = [];
app.post("/delivery-calculate", (req, res) => {
  const endCountryCode = req.body.end;
  const products = req.body.products;
  fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/logistic/freightCalculate",
    {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "CJ-Access-Token": `${process.env.ACCESS_TOKEN1}${process.env.ACCESS_TOKEN2}${process.env.ACCESS_TOKEN3}`,
      },
      body: JSON.stringify({
        startCountryCode: "CN",
        endCountryCode: `${endCountryCode}`,
        products: products,
      }),
    }
  )
    .then((response) => response.json())
    .then((data) => {

      // Filter options
      const options = data.data
        .filter((option) => {
          return (
            option.logisticName === "CJPacket Ordinary" ||
            option.logisticName === "CJPacket Fast Ordinary" ||
            option.logisticName === "DHL Official"
          );
        })
        .map((option) => {
          delvieryArray.push({
            name: option.logisticName,
            price: option.logisticPrice,
            time: option.logisticAging,
          });

          return {
            name: option.logisticName,
            price: option.logisticPrice,
            time: option.logisticAging,
          };
        });
      res.json(options);
    })
    .catch((error) => console.error("Error:", error));
});
app.post("/create_order", (req, res) => {
  if (isOk === true) {
    currentPrice = Number(currentPrice.toFixed(2));
    get_access_token()
      .then((access_token) => {
        let order_data_json = {
          intent: req.body.intent.toUpperCase(),
          purchase_units: [
            {
              amount: {
                currency_code: "USD",
                value: `${currentPrice}`,
              },
            },
          ],
        };
        const data = JSON.stringify(order_data_json);

        fetch(endpoint_url + "/v2/checkout/orders", {
          //https://developer.paypal.com/docs/api/orders/v2/#orders_create
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
          },
          body: data,
        })
          .then((res) => res.json())
          .then((json) => {
            res.send(json);
          }); //Send minimal data to client
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send(err);
      });
  } else {
  }
});
function get_access_token() {
  const auth = `${client_id}:${client_secret}`;
  const data = "grant_type=client_credentials";
  return fetch(endpoint_url + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
    },
    body: data,
  })
    .then((res) => res.json())
    .then((json) => {
      return json.access_token;
    });
}
app.post("/complete_order", (req, res) => {
  get_access_token()
    .then((access_token) => {
      fetch(
        endpoint_url +
          "/v2/checkout/orders/" +
          req.body.order_id +
          "/" +
          req.body.intent,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
        .then((res) => res.json())
        .then((json) => {
          res.send(json);
        }); //Send minimal data to client
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});
let isOk = false;
let currentPrice;
app.post("/check-price", (req, res) => {
  const deliveryPrice = req.body.price;
  const deliveryNamee = req.body.name;
  delvieryArray.forEach((arrus) => {
    if (arrus.name === `${deliveryNamee}`) {
      let arrusPrice;
      if (deliveryNamee === "CJPacket Ordinary") {
        // Assuming option.price is the variable you want to modify
        if (arrus.price >= 23) {
          arrusPrice = arrus.price - 23;
        } else {
          arrusPrice = 0;
        }
      }
      if (deliveryNamee === "CJPacket Fast Ordinary") {
        arrusPrice = Math.max(5, arrus.price - 23);
      }
      if (deliveryNamee === "DHL Official") {
        arrusPrice = Math.max(10, arrus.price - 23);
        arrusPrice = Math.round(arrusPrice * 2) / 2;
      }
      arrusPrice = Number(arrusPrice.toFixed(2));
      if (deliveryPrice === arrusPrice) {
        isOk = true;
        currentPrice = 45.99 + arrusPrice;
      } else {
        isOk = false;
      }
    }
  });
});
// Set up a cron job to trigger a request every 15 minutes
cron.schedule('*/15 * * * *', async () => {
    try {
        // Replace 'https://yourwebsite.com' with your actual website URL
        await axios.get('https://preppal.onrender.com/keepalive');
        console.log('Keep-alive request sent successfully.');
    } catch (error) {
        console.error('Error sending keep-alive request:', error.message);
    }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
