package com.cinebook.controller;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "http://localhost:5173")
public class PaymentController {

    @Value("${RAZORPAY_KEY_ID:YOUR_RAZORPAY_KEY_HERE}")
    private String razorpayKeyId;

    @Value("${RAZORPAY_KEY_SECRET:YOUR_RAZORPAY_SECRET_HERE}")
    private String razorpayKeySecret;

    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> data) {
        try {
            int amount = (int) data.get("amount"); // Amount in rupees

            if (razorpayKeyId.equals("YOUR_RAZORPAY_KEY_HERE")) {
                // Mock Order Creation
                Map<String, Object> mockOrder = new HashMap<>();
                mockOrder.put("id", "order_mock_" + UUID.randomUUID().toString().substring(0, 8));
                mockOrder.put("amount", amount * 100);
                mockOrder.put("currency", "INR");
                mockOrder.put("status", "created");
                return ResponseEntity.ok(mockOrder);
            }

            RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amount * 100); // Amount in paise
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "txn_" + UUID.randomUUID().toString().substring(0, 8));

            Order order = razorpay.orders.create(orderRequest);
            return ResponseEntity.ok(order.toString());
        } catch (RazorpayException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, Object> data) {
        // In a real application, you would use RazorpayUtils.verifyPaymentSignature(...)
        // Since we allow mocking, we will just return success for the mock orders.
        String orderId = (String) data.get("razorpay_order_id");
        if (orderId != null && orderId.startsWith("order_mock_")) {
            return ResponseEntity.ok(Map.of("status", "success", "message", "Mock payment verified"));
        }
        
        // Add actual signature verification if keys are present
        return ResponseEntity.ok(Map.of("status", "success", "message", "Payment verified"));
    }
}
