import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { recipientEmail, recipientName, companyName } = await req.json();

    if (!recipientEmail || !recipientName) {
      return NextResponse.json(
        { error: "El nombre y correo del destinatario son obligatorios." },
        { status: 400 }
      );
    }

    // Generate unique code without using external libraries
    const randomHex = () => Math.random().toString(16).substring(2, 10).toUpperCase();
    const code = "INV-" + randomHex();

    // Create the unique link
    let baseUrl = "http://localhost:3000";
    if (typeof window !== "undefined") {
      baseUrl = window.location.origin;
    } else if (process.env.NEXTAUTH_URL) {
      baseUrl = process.env.NEXTAUTH_URL;
    }

    const inviteLink = `${baseUrl}/register?code=${code}&email=${encodeURIComponent(
      recipientEmail
    )}&name=${encodeURIComponent(recipientName)}&company=${encodeURIComponent(
      companyName || ""
    )}`;

    return NextResponse.json({
      success: true,
      code,
      inviteLink,
      recipientEmail,
      recipientName,
      companyName,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Error al generar la invitación." },
      { status: 500 }
    );
  }
}