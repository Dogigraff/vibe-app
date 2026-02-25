/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VIBE — Find Your Vibe in 5 Minutes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #1a0533 0%, #0a1628 50%, #0f172a 100%)",
                    fontFamily: "sans-serif",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Decorative circles */}
                <div
                    style={{
                        position: "absolute",
                        top: "-100px",
                        right: "-100px",
                        width: "400px",
                        height: "400px",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: "-80px",
                        left: "-80px",
                        width: "300px",
                        height: "300px",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)",
                    }}
                />

                {/* Logo */}
                <div
                    style={{
                        fontSize: "120px",
                        fontWeight: 900,
                        color: "#ffffff",
                        letterSpacing: "-4px",
                        lineHeight: 1,
                        marginBottom: "16px",
                        textShadow: "0 0 60px rgba(139,92,246,0.5)",
                    }}
                >
                    VIBE
                </div>

                {/* Tagline */}
                <div
                    style={{
                        fontSize: "32px",
                        fontWeight: 400,
                        color: "rgba(255,255,255,0.7)",
                        letterSpacing: "2px",
                    }}
                >
                    Find your vibe in 5 minutes
                </div>

                {/* Accent line */}
                <div
                    style={{
                        marginTop: "32px",
                        width: "120px",
                        height: "4px",
                        borderRadius: "2px",
                        background: "linear-gradient(90deg, #8b5cf6, #3b82f6)",
                    }}
                />
            </div>
        ),
        { ...size }
    );
}
