"use client"

import React, { useState, useEffect, Suspense, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
} from "@mui/material"

import { useUserStore } from "../../store/UserSlice"; 

function OTPContent() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(15)
  const [canResend, setCanResend] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const { verifyOtp, loading, resendOtp } = useUserStore();

  const searchParams = new URLSearchParams(location.search)
  const email = searchParams.get("email")

  const inputRefs = useRef([])

  useEffect(() => {
    if (!email) {
      navigate("/")
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [email, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const otpString = otp.join("")
    if (!otpString) {
      setError("OTP is required")
      return
    }

    if (otpString.length !== 6) {
      setError("OTP must be 6 digits")
      return
    }

    try {
      const data = await verifyOtp(email, otpString);
      if(data.user.role ==="admin"){
        navigate("/admin");
      }else{
      navigate("/"); 
      }// redirect after login
    } catch (err) {
      setError(err.message || "Invalid OTP");
    }
  }

  const handleDigitChange = (index, value) => {
    if (value.length > 1) return
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError("")

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleResendOTP = async () => {
  try {
    await resendOtp(email);
    
    setCountdown(15);
    setCanResend(false);
    setError("");
    setOtp(["", "", "", "", "", ""]);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  } catch (err) {
    setError(err.message || "Failed to resend OTP");
  }
};

  return (
    <Box className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <Card sx={{ width: "100%", maxWidth: 400, boxShadow: 4, p: 2 }}>
        <CardContent sx={{ textAlign: "center" }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Verify Your Email
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            We've sent a 6-digit code to <br />
            <strong>{email}</strong>
          </Typography>

          <form onSubmit={handleSubmit}>
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Enter OTP
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loading}
                    style={{
                      width: "48px",
                      height: "48px",
                      textAlign: "center",
                      fontSize: "18px",
                      fontWeight: "bold",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                    }}
                  />
                ))}
              </Box>
              {error && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              disabled={loading || otp.join("").length !== 6}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>

             <Box textAlign="center" mt={2}>
              <Typography variant="body2" color="text.secondary">
                Didn't receive the code?
              </Typography>
              <Button
                type="button"
                onClick={handleResendOTP}
                disabled={!canResend}
                size="small"
              >
                {canResend ? "Resend OTP" : `Resend in ${countdown}s`}
              </Button>
            </Box> 
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}

export default function OTPPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OTPContent />
    </Suspense>
  )
}
