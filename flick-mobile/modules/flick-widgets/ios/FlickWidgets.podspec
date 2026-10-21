Pod::Spec.new do |s|
  s.name           = 'FlickWidgets'
  s.version        = '0.1.0'
  s.summary        = 'Shares Flick data with the widgets through the App Group.'
  s.author         = 'Flick'
  s.homepage       = 'https://flickit.dev'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
