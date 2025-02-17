export async function GET(request, { params }) {
    const { artist, title } = params;
    if (!artist || !title) {
      return new Response(
        JSON.stringify({ error: "Missing artist or title parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  
    // Use the proxy endpoint from lyrics.ovh documentation.
    const apiUrl = `https://api.lyrics.ovh/v1/${artist}/${title}`;
  
    try {
      const res = await fetch(apiUrl);
      // If the response is not OK or the Content-Type is not JSON, treat it as an error.
      const contentType = res.headers.get("Content-Type") || "";
      if (!res.ok || !contentType.includes("application/json")) {
        return new Response(
          JSON.stringify({ error: "Lyrics not found" }),
          { status: res.status, headers: { "Content-Type": "application/json" } }
        );
      }
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  