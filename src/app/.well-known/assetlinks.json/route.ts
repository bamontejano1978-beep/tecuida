import { NextResponse } from 'next/server'

const TWA_PACKAGE_NAME = 'group.tecuida.app'
const TWA_SHA256_CERT_FINGERPRINT =
  '54:71:38:3B:9F:F4:31:CA:53:E8:EE:9B:45:80:75:63:52:C8:3E:4A:B0:9B:FC:29:79:29:56:34:A5:FD:46:39'

export async function GET() {
  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: TWA_PACKAGE_NAME,
          sha256_cert_fingerprints: [TWA_SHA256_CERT_FINGERPRINT],
        },
      },
    ],
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    },
  )
}
