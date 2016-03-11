define(['bower_components/sjcl/sjcl'], function(sjcl) {
  return function(string) {
    var bitarray = sjcl.hash.sha256.hash(string);
    return sjcl.codec.hex.fromBits(bitarray);
  }
});