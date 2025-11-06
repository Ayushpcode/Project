const express = require("express");
const router = express.Router();
const {
  getAllCustomers,
  getCustomerById,
  deleteCustomer,
} = require("../controllers/coustomerController");

router.get("/allCustomer", getAllCustomers);
router.get("/getCustomer/:id", getCustomerById);
router.delete("/deleteCustomer/:id", deleteCustomer);

module.exports = router;
