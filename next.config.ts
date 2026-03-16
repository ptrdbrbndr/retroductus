import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  transpilePackages: ['bpmn-js', 'diagram-js', 'bpmn-moddle'],
}
export default nextConfig
